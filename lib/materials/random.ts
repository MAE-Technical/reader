import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { toMaterialSummary } from "@/lib/materials/summary";
import type { MaterialSummary } from "@/lib/api/types";

// Plenty for today's catalog size — pulling this many rows client-side and
// shuffling in memory is simpler than a DB-side TABLESAMPLE/`order by
// random()` query (which supabase-js's query builder has no first-class
// support for anyway, since `.order()` expects a real column name, not an
// arbitrary SQL expression). Revisit with a Postgres function if the
// catalog ever grows past what's cheap to pull whole.
const SAMPLE_POOL_SIZE = 200;

/**
 * Backs `GET /api/general/random-books` — the home page's "Top books"
 * rail. Genuinely random each call (a fresh shuffle, not "whatever order
 * Postgres happened to return"), not ranked by any engagement signal —
 * see lib/materials/list.ts's `listPublishedMaterials` (ordered, cursor-
 * paginated) for the library page's actual "top by notes+reactions" sort.
 */
export async function getRandomPublishedMaterials(count = 5): Promise<MaterialSummary[]> {
  const { data, error } = await getSupabaseAdminClient()
    .from("materials")
    .select("*")
    .eq("status", "published")
    .limit(SAMPLE_POOL_SIZE);

  if (error || !data) return [];

  // Fisher-Yates, then take the front — an unbiased random `count`-sized
  // sample of whatever landed in the pool above.
  const pool = [...data];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count).map(toMaterialSummary);
}
