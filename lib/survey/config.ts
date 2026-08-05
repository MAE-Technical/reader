import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { toMaterialSummary } from "@/lib/materials/summary";
import type { MaterialSummary } from "@/lib/api/types";

const CONFIG_PATH = path.join(process.cwd(), "config", "survey.json");

export type SurveyCategory = { value: string; label: string };
type RawSurveyConfig = { categories: SurveyCategory[]; readMaterialIds: string[] };

let cached: RawSurveyConfig | undefined;

async function loadRawConfig(): Promise<RawSurveyConfig> {
  if (!cached) {
    cached = JSON.parse(await readFile(CONFIG_PATH, "utf-8")) as RawSurveyConfig;
  }
  return cached;
}

/** The signup survey's "what are you interested in?" pills — same
 * `{value, label}` shape SurveyWizard.tsx's `INTERESTS` already uses,
 * `value` a slug matching `readers.interests`' entries. */
export async function getSurveyCategories(): Promise<SurveyCategory[]> {
  return (await loadRawConfig()).categories;
}

/**
 * Resolves the survey's curated "have you read any of these?" book list
 * against the real `materials` table. The JSON config only ever stores
 * `materialId`s (real `materials.id` UUIDs, never slugs — matches
 * `api-spec.md`'s `ReaderProfile.surveyReadMaterialIds`, which is exactly
 * this shape) — title/author/cover always come live from the DB here, so
 * this list can never drift from what `scripts/publish-book.ts` actually
 * published, the way baking those fields into the JSON directly would.
 */
export async function getSurveyBooks(): Promise<MaterialSummary[]> {
  const { readMaterialIds } = await loadRawConfig();
  if (readMaterialIds.length === 0) return [];
  const { data } = await getSupabaseAdminClient().from("materials").select("*").in("id", readMaterialIds);
  // Preserve the config's own ordering rather than whatever order the DB
  // happens to return — the JSON is the curation, the DB is just the lookup.
  const bySummaryId = new Map((data ?? []).map((row) => [row.id, toMaterialSummary(row)]));
  return readMaterialIds.map((id) => bySummaryId.get(id)).filter((m) => m !== undefined);
}
