import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import type { Database } from "@/lib/supabase/database.types";
import type { AnnotationRange, Note, NoteContent } from "@/lib/api/types";

export type NoteRow = Database["public"]["Tables"]["notes"]["Row"];

/** notes row -> the typed columns a write needs (api-spec.md's NoteContent
 * union -> models-spec.md's split content_kind/content_text/content_audio_*
 * columns, chosen so a `check` constraint can enforce "exactly one of
 * text/voice" at the DB level, not just in app code). */
export function contentToColumns(content: NoteContent) {
  if (content.kind === "text") {
    return { content_kind: "text" as const, content_text: content.text, content_audio_url: null, content_audio_duration_ms: null };
  }
  return {
    content_kind: "voice" as const,
    content_text: null,
    content_audio_url: content.audioUrl,
    content_audio_duration_ms: content.durationMs,
  };
}

function contentFromRow(row: NoteRow): NoteContent {
  if (row.content_kind === "voice") {
    return { kind: "voice", audioUrl: row.content_audio_url!, durationMs: row.content_audio_duration_ms! };
  }
  return { kind: "text", text: row.content_text! };
}

/** snake_case notes row -> camelCase Note (api-spec.md's Shared Types). Author
 * pseudonym and reactedByMe are looked up separately (no typed FK embedding —
 * see the pseudonym/reaction helpers below) and passed in rather than
 * queried per-row, so a list of N notes costs one extra query, not N. */
export function toNote(row: NoteRow, pseudonym: string, reactedByMe: boolean): Note {
  return {
    id: row.id,
    materialId: row.material_id,
    author: { readerId: row.reader_id, pseudonym },
    ranges: row.ranges as AnnotationRange[],
    parentId: row.parent_id,
    replyingToId: row.replying_to_id,
    content: contentFromRow(row),
    visibility: row.visibility,
    reactionCount: row.reaction_count,
    reactedByMe,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Only public rows, or rows the caller themself authored — the one
 * visibility rule shared by every notes-reading endpoint (per-material feed,
 * global feed, single thread). Unauthenticated callers (readerId undefined)
 * only ever see public notes. */
export function visibleToFilter(readerId: string | undefined): string {
  return readerId ? `visibility.eq.public,reader_id.eq.${readerId}` : "visibility.eq.public";
}

export async function getPseudonymsByReaderId(readerIds: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(readerIds));
  if (unique.length === 0) return new Map();
  const { data } = await getSupabaseAdminClient().from("readers").select("id, pseudonym").in("id", unique);
  return new Map((data ?? []).map((r) => [r.id, r.pseudonym]));
}

export async function getReactedNoteIds(readerId: string | undefined, noteIds: string[]): Promise<Set<string>> {
  if (!readerId || noteIds.length === 0) return new Set();
  const { data } = await getSupabaseAdminClient()
    .from("note_reactions")
    .select("note_id")
    .eq("reader_id", readerId)
    .in("note_id", noteIds);
  return new Set((data ?? []).map((r) => r.note_id));
}

/** Batch-hydrates a set of note rows into full Note[] — one pseudonym query
 * and one reactions query for the whole batch, in the same reply/thread
 * hydration shape every notes-reading route needs. */
export async function hydrateNotes(rows: NoteRow[], callerId: string | undefined): Promise<Note[]> {
  if (rows.length === 0) return [];
  const [pseudonyms, reacted] = await Promise.all([
    getPseudonymsByReaderId(rows.map((r) => r.reader_id)),
    getReactedNoteIds(callerId, rows.map((r) => r.id)),
  ]);
  return rows.map((row) => toNote(row, pseudonyms.get(row.reader_id) ?? "Unknown", reacted.has(row.id)));
}
