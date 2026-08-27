/** Columns required to render a catalogue card. Keep this list deliberately
 * narrow: materials also contains reader/navigation data that can be large. */
export const MATERIAL_SUMMARY_COLUMNS =
  "id, slug, material_type, title, author, description, cover_url, thumbnail_url, google_cover_url, google_thumbnail_url, language, published_year, page_count_estimate, categories, created_at";

/** Metadata required by detail pages, excluding TOC/spine payloads. */
export const MATERIAL_DETAIL_COLUMNS =
  `${MATERIAL_SUMMARY_COLUMNS}, google_description, google_meta_data, narrator_count, json_storage_path, status, updated_at`;
