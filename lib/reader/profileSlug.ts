import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import type { Database } from "@/lib/supabase/database.types";

type ReaderRow = Database["public"]["Tables"]["readers"]["Row"];

/**
 * A reader's pseudonym, url-safe — `readers.pseudonym` (migrations/
 * migration.sql, `readers_pseudonym_unique`) has no dedicated slug column,
 * so a profile link (CurrentReaders.tsx, app/(app)/[handle]'s `/@{slug}`) is
 * derived from it directly rather than adding one. Lowercased, every run of
 * whitespace/punctuation collapsed to a single hyphen, leading/trailing
 * hyphens trimmed — "Adaeze" -> "adaeze". Every pseudonym on file today is
 * a single word, but this also degrades sensibly for one that isn't.
 */
export function pseudonymToSlug(pseudonym: string): string {
  return pseudonym
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolves a profile slug back to its reader row. There's no slug column to
 * query directly (see pseudonymToSlug above), so this narrows with a
 * wildcard `ilike` built from the slug's own hyphen boundaries — safe,
 * since pseudonymToSlug only ever removes or collapses characters, never
 * introduces ones absent from the original pseudonym — then re-slugifies
 * each candidate in app code to confirm an exact match. `readers.pseudonym`
 * is unique, so this is normally a one-row narrow-then-confirm, not a real
 * scan; slug collisions between two distinct pseudonyms aren't expected at
 * this app's scale.
 */
export async function resolveReaderBySlug(slug: string): Promise<ReaderRow | null> {
  const segments = slug.split("-").filter(Boolean);
  if (segments.length === 0) return null;
  const pattern = `%${segments.join("%")}%`;
  const { data } = await getSupabaseAdminClient().from("readers").select("*").ilike("pseudonym", pattern);
  return (data ?? []).find((row) => pseudonymToSlug(row.pseudonym) === slug) ?? null;
}
