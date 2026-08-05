import type { Database } from "@/lib/supabase/database.types";
import type { MaterialSummary } from "@/lib/api/types";

type MaterialRow = Database["public"]["Tables"]["materials"]["Row"];

/** snake_case materials row -> camelCase MaterialSummary (api-spec.md's Shared Types). */
export function toMaterialSummary(row: MaterialRow): MaterialSummary {
  return {
    id: row.id,
    slug: row.slug,
    materialType: row.material_type,
    title: row.title,
    author: row.author,
    description: row.description,
    cover: row.cover_url,
    language: row.language,
    publishedYear: row.published_year,
    pageCountEstimate: row.page_count_estimate,
    categories: (row.categories as string[] | null) ?? [],
  };
}
