import { storagePublicUrl } from "@/lib/storage/config";
import { parseBookDocument, type BookDocument } from "@/lib/book/schema";
import { buildSectionsById } from "@/lib/reader/sections";
import type { Database } from "@/lib/supabase/database.types";

type MaterialRow = Database["public"]["Tables"]["materials"]["Row"];

// Everything `fields=` may request. DB-only fields resolve straight off the
// row; `narrators`/`notes`/a `sections` request that also carries a
// `sectionId` are the only ones that ever touch Storage (api-spec.md § 2).
const DB_ONLY_FIELDS = new Set([
  "title",
  "author",
  "description",
  "cover",
  "language",
  "publishedYear",
  "pageCountEstimate",
  "narratorCount",
  "spine",
]);
const STORAGE_FIELDS = new Set(["narrators", "notes"]);

export class MaterialSectionNotFoundError extends Error {}

async function fetchBookFromStorage(jsonStoragePath: string): Promise<BookDocument> {
  const res = await fetch(storagePublicUrl(jsonStoragePath));
  if (!res.ok) throw new Error(`Could not fetch book JSON at ${jsonStoragePath} (${res.status})`);
  const parsed = parseBookDocument(await res.json());
  if (!parsed.ok) throw new Error(`Invalid book JSON at ${jsonStoragePath}: ${parsed.error.message}`);
  return parsed.data;
}

/**
 * The `fields=` resolver — given a `materials` row and the requested field
 * list, returns DB-only data immediately; only fetches+parses the full
 * `BookDocument` from Storage when `narrators`, `notes`, or a `sectionId`-
 * scoped `sections` request actually needs it. Isolated here so every route
 * handler that touches a material's projectable fields (the details route
 * today) stays a thin wrapper around this.
 */
export async function projectMaterial(
  row: MaterialRow,
  opts: { fields: string[]; sectionId?: string; passagesOnly?: boolean }
): Promise<Record<string, unknown>> {
  const fields = new Set(opts.fields);
  const result: Record<string, unknown> = { id: row.id, slug: row.slug };

  const needsSectionContent = fields.has("sections") && !!opts.sectionId;
  const needsStorage = [...fields].some((f) => STORAGE_FIELDS.has(f)) || needsSectionContent;
  const book = needsStorage ? await fetchBookFromStorage(row.json_storage_path) : null;

  for (const field of fields) {
    if (DB_ONLY_FIELDS.has(field)) {
      switch (field) {
        case "title":
          result.title = row.title;
          break;
        case "author":
          result.author = row.author;
          break;
        case "description":
          result.description = row.description;
          break;
        case "cover":
          result.cover = row.cover_url;
          break;
        case "language":
          result.language = row.language;
          break;
        case "publishedYear":
          result.publishedYear = row.published_year;
          break;
        case "pageCountEstimate":
          result.pageCountEstimate = row.page_count_estimate;
          break;
        case "narratorCount":
          result.narratorCount = row.narrator_count;
          break;
        case "spine":
          result.spine = row.spine;
          break;
      }
      continue;
    }

    if (field === "sections") {
      if (!opts.sectionId) {
        // Pure DB path — the pruned TocSection[] populated at publish time,
        // no passage content, no Storage round trip.
        result.sections = row.toc;
        continue;
      }
      // sectionId set — always a Storage read for that one section's real
      // content (api-spec.md: "DB-backed sections only carries the outline
      // shape ... combine with sectionId to fetch that one section's full
      // content").
      const section = buildSectionsById(book!.sections).get(opts.sectionId);
      if (!section) throw new MaterialSectionNotFoundError(opts.sectionId);
      if (opts.passagesOnly) {
        // Top-level key becomes `passages`, not nested under `sections` —
        // "just paragraphs of a specific section" (api-spec.md's example).
        result.passages = section.passages;
      } else {
        result.sections = section;
      }
      continue;
    }

    if (field === "narrators") {
      result.narrators = book!.narrators;
      continue;
    }
    if (field === "notes") {
      // The book's own footnotes/endnotes (BookDocument.notes), NOT
      // community notes — those are a separate endpoint
      // (`GET /api/materials/{materialId}/notes`). Don't conflate the two.
      result.notes = book!.notes;
      continue;
    }
    // Unknown field name — ignored rather than erroring, so a client can
    // request a superset without every route needing to stay in lockstep.
  }

  return result;
}
