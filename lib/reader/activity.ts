import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import type { CurrentReadingEntry } from "@/lib/api/types";
import { CURRENT_READERS_DISPLAY_CAP } from "./constants";

type ActivityInput = {
  materialId: string;
  sectionId: string;
  passageIndex: number;
  audioTimeMs: number | null;
  progressPercent: number;
};

/**
 * Upserts one reader's position in one material (`public.reader_activities`,
 * migrations/20260831_reader_activities.sql) — a single-row write, replacing the old
 * fetch-the-whole-map-then-write-it-back-with-one-key-changed against
 * readers.current_reading.
 */
export async function saveReaderActivity(readerId: string, entry: ActivityInput): Promise<boolean> {
  const { error } = await getSupabaseAdminClient()
    .from("reader_activities")
    .upsert(
      {
        reader_id: readerId,
        material_id: entry.materialId,
        section_id: entry.sectionId,
        passage_index: entry.passageIndex,
        audio_time_ms: entry.audioTimeMs,
        progress_percent: entry.progressPercent,
      },
      { onConflict: "reader_id,material_id" }
    );
  return !error;
}

/**
 * This reader's activity across every material, most recently updated first —
 * GET /api/auth/me/continue-reading's source, sorted by the DB (reader_activities_
 * reader_updated_idx) instead of an Object.values().sort() over the old jsonb map.
 */
export async function listReaderActivities(readerId: string): Promise<CurrentReadingEntry[]> {
  const { data, error } = await getSupabaseAdminClient()
    .from("reader_activities")
    .select("*")
    .eq("reader_id", readerId)
    .order("updated_at", { ascending: false });
  if (error || !data) return [];

  return data.map((row) => ({
    materialId: row.material_id,
    sectionId: row.section_id,
    passageIndex: row.passage_index,
    audioTimeMs: row.audio_time_ms,
    progressPercent: row.progress_percent,
    updatedAt: row.updated_at,
  }));
}

export type CurrentReaderSnippet = {
  readerId: string;
  pseudonym: string;
  /** Non-null iff this reader's most recent activity on the material was via
   * audio (NarrationEngine always writes audioTimeMs, even 0ms, the moment
   * playback starts — same signal BookDetailView's own "hasListened" uses
   * for the viewer's own position). Drives the roster's reading/listening
   * mode icon. */
  audioTimeMs: number | null;
  updatedAt: string;
};

/**
 * "Who's currently reading/listening to each of these materials" — a book
 * list row's presence line and the book-detail page's reading-room roster
 * (app/components/shared/CurrentReaders.tsx), batched: one reader_activities
 * query plus one readers query *total*, no matter how many materialIds are
 * passed in — the exact join the old readers.current_reading jsonb blob
 * couldn't serve without a full scan, which is what motivated splitting it
 * into this table in the first place.
 *
 * Every material's entry is capped at `cap`, most recently active first — a
 * book with hundreds of concurrent readers still costs one bounded readers
 * lookup, not one row per active reader. `totalCount` carries the real
 * number so the UI can render "+N more" without ever needing every
 * pseudonym. `cap` defaults to the list-row/library-page-safe
 * CURRENT_READERS_DISPLAY_CAP; a single book-detail page (one material, not
 * 24) can afford CURRENT_READERS_DETAIL_CAP instead, so its roster has real
 * pseudonyms to expand "+N more comrades" into.
 */
export async function listCurrentReaders(
  materialIds: string[],
  cap: number = CURRENT_READERS_DISPLAY_CAP
): Promise<Map<string, { readers: CurrentReaderSnippet[]; totalCount: number }>> {
  const result = new Map<string, { readers: CurrentReaderSnippet[]; totalCount: number }>();
  if (materialIds.length === 0) return result;

  const { data: activityRows, error } = await getSupabaseAdminClient()
    .from("reader_activities")
    .select("reader_id, material_id, audio_time_ms, updated_at")
    .in("material_id", materialIds)
    .order("updated_at", { ascending: false });
  if (error || !activityRows || activityRows.length === 0) return result;

  // materialId -> every active reader's row, most recently updated first
  // (preserved from the query's own order() above).
  type ActivityRow = { readerId: string; audioTimeMs: number | null; updatedAt: string };
  const rowsByMaterial = new Map<string, ActivityRow[]>();
  for (const row of activityRows) {
    const entry: ActivityRow = { readerId: row.reader_id, audioTimeMs: row.audio_time_ms, updatedAt: row.updated_at };
    const list = rowsByMaterial.get(row.material_id);
    if (list) list.push(entry);
    else rowsByMaterial.set(row.material_id, [entry]);
  }

  // Only look up pseudonyms for readers actually within the cap — the rest
  // only ever surface as part of totalCount below.
  const neededReaderIds = new Set<string>();
  for (const rows of rowsByMaterial.values()) {
    for (const row of rows.slice(0, cap)) neededReaderIds.add(row.readerId);
  }

  const { data: readerRows } = await getSupabaseAdminClient()
    .from("readers")
    .select("id, pseudonym")
    .in("id", [...neededReaderIds]);
  const pseudonymById = new Map((readerRows ?? []).map((r) => [r.id, r.pseudonym]));

  for (const [materialId, rows] of rowsByMaterial) {
    const readers = rows
      .slice(0, cap)
      .map((row) => {
        const pseudonym = pseudonymById.get(row.readerId);
        return pseudonym ? { readerId: row.readerId, pseudonym, audioTimeMs: row.audioTimeMs, updatedAt: row.updatedAt } : null;
      })
      // Guards a reader row deleted between the two queries above — the
      // same edge case the backfill's own `where exists` guarded for.
      .filter((r): r is CurrentReaderSnippet => r !== null);
    result.set(materialId, { readers, totalCount: rows.length });
  }
  return result;
}
