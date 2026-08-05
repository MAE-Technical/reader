import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { toMaterialSummary } from "@/lib/materials/summary";
import { encodeCursor, keysetBeforeFilter, type Keyset } from "@/lib/api/cursor";
import type { MaterialSummary } from "@/lib/api/types";

/**
 * `plainto_tsquery` (what this used before) matches whole lexemes only —
 * "bla" produces the lexeme `bla`, which never matches the stored `black`
 * lexeme no matter how the two relate, even though "black" itself matches
 * fine. That reads as broken for a live, as-you-type search box: typing
 * the first few letters of a real match should always narrow toward it,
 * never lose it partway through. Building the tsquery ourselves — each
 * token suffixed `:*` (Postgres's own prefix-match operator) and AND'd
 * together — fixes exactly that (`bla:*` matches `black`), while keeping
 * the tsvector's real benefits over a plain ILIKE scan (stemming,
 * multi-column weighting, the GIN index) for the multi-word case.
 * Passed to `.textSearch()` with no `type` option — that sends this
 * straight through as a raw `to_tsquery()` expression, per postgrest-js's
 * own textSearch(): `type` is what selects plainto_tsquery/phraseto_tsquery/
 * websearch_to_tsquery instead; omitting it is the one way to reach
 * to_tsquery, which is the only variant that understands `:*` at all.
 */
function toPrefixTsQuery(input: string): string | null {
  const tokens = input
    .split(/\s+/)
    .map((t) => t.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean);
  if (tokens.length === 0) return null;
  return tokens.map((t) => `${t}:*`).join(" & ");
}

export type MaterialsSort = "recent" | "top";

/** Offset into the engagement-ranked pool `listByEngagement` builds below —
 * a distinct shape from `recent`'s {createdAt, id} keyset, since `top`'s
 * order (a computed score, not a real indexed column) can't be resumed
 * from a (createdAt, id) pair the way a column-ordered list can. Still an
 * opaque cursor as far as any caller is concerned — same encodeCursor
 * codec, just a different payload shape. */
export type OffsetCursor = { offset: number };

export type ListMaterialsOptions = {
  category?: string | null;
  search?: string | null;
  limit?: number;
  /** "recent" (default): `createdAt` descending — every existing caller's
   * behavior, unchanged. "top": ranked by each material's own community
   * engagement (its public notes, each worth 1 + however many reactions
   * it's gotten), highest first — the library page's default view. */
  sort?: MaterialsSort;
  cursor?: Keyset | OffsetCursor | null;
};

// Cap on how many published rows `top` pulls into memory to rank — plenty
// for today's catalog size, same tradeoff as getRandomPublishedMaterials's
// own SAMPLE_POOL_SIZE (no denormalized per-material engagement column
// exists yet to sort on at the DB level instead — see models-spec.md's
// notes.reaction_count trigger for the equivalent pattern one table over,
// which this would mirror if the catalog ever grows past what's cheap to
// rank here in JS on every request).
const ENGAGEMENT_POOL_SIZE = 500;

async function listByEngagement(
  opts: ListMaterialsOptions,
  limit: number
): Promise<{ items: MaterialSummary[]; nextCursor: string | null }> {
  const admin = getSupabaseAdminClient();

  let materialsQuery = admin
    .from("materials")
    .select("*")
    .eq("status", "published")
    .limit(ENGAGEMENT_POOL_SIZE);

  if (opts.category) materialsQuery = materialsQuery.contains("categories", [opts.category]);
  const engagementTsQuery = opts.search ? toPrefixTsQuery(opts.search) : null;
  if (engagementTsQuery) materialsQuery = materialsQuery.textSearch("search_vector", engagementTsQuery, { config: "english" });

  const { data: materialRows, error: materialsError } = await materialsQuery;
  if (materialsError || !materialRows || materialRows.length === 0) return { items: [], nextCursor: null };

  const ids = materialRows.map((row) => row.id);
  const { data: noteRows } = await admin
    .from("notes")
    .select("material_id, reaction_count")
    .eq("visibility", "public")
    .in("material_id", ids);

  // materialId -> engagement score. Each public note is worth 1 (the "a
  // note exists at all" signal) plus however many reactions it's drawn —
  // "notes + notes-reactions" per the product ask. Private notes never
  // count, same visibility rule the notes endpoints themselves enforce.
  const engagement = new Map<string, number>();
  for (const note of noteRows ?? []) {
    engagement.set(note.material_id, (engagement.get(note.material_id) ?? 0) + 1 + note.reaction_count);
  }

  const ranked = [...materialRows].sort((a, b) => {
    const scoreDiff = (engagement.get(b.id) ?? 0) - (engagement.get(a.id) ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    // Stable tie-break for materials with equal (often zero) engagement —
    // newest first, same order `recent` uses as its own primary sort.
    if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
    return a.id < b.id ? 1 : -1;
  });

  const offset = opts.cursor && "offset" in opts.cursor ? opts.cursor.offset : 0;
  const page = ranked.slice(offset, offset + limit);
  const nextOffset = offset + limit;
  const nextCursor = nextOffset < ranked.length ? encodeCursor<OffsetCursor>({ offset: nextOffset }) : null;

  return { items: page.map(toMaterialSummary), nextCursor };
}

/**
 * Shared query behind `GET /api/materials` — factored out so a server
 * component that needs the same published-materials list (the survey
 * wizard's "have you read any of these" picker, the library browse page)
 * can call straight into it instead of round-tripping an HTTP request to
 * this app's own API from within itself.
 */
export async function listPublishedMaterials(
  opts: ListMaterialsOptions = {}
): Promise<{ items: MaterialSummary[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(opts.limit ?? 24, 1), 100);

  if (opts.sort === "top") return listByEngagement(opts, limit);

  let query = getSupabaseAdminClient()
    .from("materials")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (opts.category) query = query.contains("categories", [opts.category]);
  // See toPrefixTsQuery's own doc comment for why this isn't plainto_tsquery
  // — and app/api/materials/route.ts's comment on the remaining gap:
  // recency, not true ts_rank relevance, since there's no computed column
  // to order by yet.
  const tsQuery = opts.search ? toPrefixTsQuery(opts.search) : null;
  if (tsQuery) query = query.textSearch("search_vector", tsQuery, { config: "english" });
  if (opts.cursor && "createdAt" in opts.cursor) query = query.or(keysetBeforeFilter(opts.cursor));

  const { data, error } = await query;
  if (error) return { items: [], nextCursor: null };

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? encodeCursor<Keyset>({ createdAt: last.created_at, id: last.id }) : null;

  return { items: page.map(toMaterialSummary), nextCursor };
}
