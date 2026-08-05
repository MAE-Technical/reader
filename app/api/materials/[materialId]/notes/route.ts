import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { getAuthenticatedReader } from "@/lib/auth/session";
import { notFound } from "@/lib/api/errors";
import { resolveMaterialRow } from "@/lib/materials/resolve";
import { decodeCursor, encodeCursor, keysetBeforeFilter, type Keyset } from "@/lib/api/cursor";
import { hydrateNotes, visibleToFilter, type NoteRow } from "@/lib/community/notes";
import { storagePublicUrl } from "@/lib/storage/config";
import { parseBookDocument } from "@/lib/book/schema";
import { buildPassageIndex } from "@/lib/reader/sections";

// Community notes anchored anywhere in this material — NOT the book's own
// footnotes (that's `GET /api/materials/{materialId}?fields=notes`, an
// entirely different thing; see lib/materials/projection.ts's own note on
// the same naming collision).
export async function GET(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const { materialId } = await params;
  const material = await resolveMaterialRow(materialId);
  if (!material) return notFound();

  const reader = await getAuthenticatedReader(request);
  const url = new URL(request.url);
  const sectionId = url.searchParams.get("sectionId");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 100);
  const cursor = decodeCursor<Keyset>(url.searchParams.get("cursor"));

  const admin = getSupabaseAdminClient();

  // sectionId isn't indexed at the DB level (ranges is jsonb, keyed by
  // passageId) — resolved application-side by mapping the section's own
  // passage ids against each note's ranges[0] (models-spec.md's own note on
  // exactly this).
  let passageIdsForSection: Set<string> | null = null;
  if (sectionId) {
    const res = await fetch(storagePublicUrl(material.json_storage_path));
    if (res.ok) {
      const parsed = parseBookDocument(await res.json());
      if (parsed.ok) {
        passageIdsForSection = new Set(
          Array.from(buildPassageIndex(parsed.data.sections).entries())
            .filter(([, v]) => v.sectionId === sectionId)
            .map(([passageId]) => passageId)
        );
      }
    }
  }

  let query = admin
    .from("notes")
    .select("*")
    .eq("material_id", material.id)
    .is("parent_id", null)
    .or(visibleToFilter(reader?.readerId))
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  // Section-scoped counts are small in practice, so filtering post-fetch
  // just needs a generous cap rather than true DB-side pagination.
  query = passageIdsForSection ? query.limit(500) : query.limit(limit + 1);
  if (cursor && !passageIdsForSection) query = query.or(keysetBeforeFilter(cursor));

  const { data, error } = await query;
  if (error) return NextResponse.json({ items: [], nextCursor: null });

  let rows = (data ?? []) as NoteRow[];
  if (passageIdsForSection) {
    const ids = passageIdsForSection;
    rows = rows.filter((r) => (r.ranges as { passageId: string }[]).some((rg) => ids.has(rg.passageId)));
    if (cursor) {
      rows = rows.filter((r) => r.created_at < cursor.createdAt || (r.created_at === cursor.createdAt && r.id < cursor.id));
    }
  }

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null;

  // Each NoteThread nests its full reply list — per-book note counts are
  // small enough that this is simpler than a second paginated call per
  // thread (api-spec.md).
  const { data: replyRows } = page.length
    ? await admin
        .from("notes")
        .select("*")
        .in(
          "parent_id",
          page.map((r) => r.id)
        )
        .or(visibleToFilter(reader?.readerId))
        .order("created_at", { ascending: true })
    : { data: [] as NoteRow[] };

  const hydratedById = new Map((await hydrateNotes([...page, ...(replyRows ?? [])], reader?.readerId)).map((n) => [n.id, n]));

  const items = page.map((root) => ({
    note: hydratedById.get(root.id)!,
    replies: (replyRows ?? []).filter((r) => r.parent_id === root.id).map((r) => hydratedById.get(r.id)!),
  }));

  return NextResponse.json({ items, nextCursor });
}
