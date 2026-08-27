import type { Database } from "@/lib/supabase/database.types";
import type { MaterialSummary } from "@/lib/api/types";

type MaterialRow = Pick<Database["public"]["Tables"]["materials"]["Row"],
  "id" | "slug" | "material_type" | "title" | "author" | "description" | "cover_url" |
  "language" | "published_year" | "page_count_estimate" | "categories" | "thumbnail_url" |
  "google_cover_url" | "google_thumbnail_url">;

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
    thumbnail: row.thumbnail_url,
    googleCoverUrl: row.google_cover_url,
    googleThumbnailUrl: row.google_thumbnail_url,
    language: row.language,
    publishedYear: row.published_year,
    pageCountEstimate: row.page_count_estimate,
    categories: (row.categories as string[] | null) ?? [],
  };
}
