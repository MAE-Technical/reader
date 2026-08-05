import { resolveMaterialRow } from "@/lib/materials/resolve";
import { projectMaterial } from "@/lib/materials/projection";
import type { BookDocument, Narrator, Note, Section } from "@/lib/book/schema";

export class MaterialNotFoundError extends Error {
  constructor(materialId: string) {
    super(`No published material found for "${materialId}"`);
    this.name = "MaterialNotFoundError";
  }
}

const FULL_CONTENT_FIELDS = [
  "title",
  "author",
  "description",
  "cover",
  "language",
  "publishedYear",
  "pageCountEstimate",
  "spine",
  "narrators",
  "notes",
  "sections",
];

/**
 * What `/read/[slug]` and its modal counterpart actually load — the reader
 * needs the *whole* book (every section's passages) in memory today, not
 * just one section at a time (see plan.md's Phase 6 "Reader data source"
 * decision). Rather than bypass the materials table the way the old direct
 * `getBookDocument()` Storage read did, this resolves the row and calls
 * straight into the same `projectMaterial` the public
 * `GET /api/materials/{materialId}` route itself calls — no HTTP round
 * trip to this app's own API (same pattern as `listPublishedMaterials`) —
 * using `fullContent: true` to get the real `Section[]` tree instead of the
 * pruned DB-only TocSection[] outline. A slug that doesn't resolve to a
 * *published* materials row throws the same as the old `BookNotFoundError`
 * did — this is a real behavior improvement over the old direct Storage
 * read, which had no notion of "published" at all.
 */
export async function getBookDocumentFromMaterial(
  slug: string
): Promise<{ book: BookDocument; materialId: string }> {
  const row = await resolveMaterialRow(slug);
  if (!row) throw new MaterialNotFoundError(slug);

  const projected = await projectMaterial(row, { fields: FULL_CONTENT_FIELDS, fullContent: true });

  const book: BookDocument = {
    schemaVersion: 3,
    // BookDocument.id is ingestion's own slug-like internal id (api-spec.md:
    // deliberately distinct from materialId) — using the row's own slug
    // here is the closest equivalent available from this table, and is what
    // every publish actually sets it to in practice (scripts/publish-book.ts).
    id: row.slug,
    slug: row.slug,
    metadata: {
      title: projected.title as string,
      author: projected.author as string,
      description: (projected.description as string | null) ?? "",
      cover: (projected.cover as string | null) ?? "",
      language: (projected.language as string | null) ?? "",
      publishedYear: (projected.publishedYear as number | null) ?? undefined,
      pageCountEstimate: (projected.pageCountEstimate as number | null) ?? 0,
    },
    narrators: projected.narrators as Narrator[],
    sections: projected.sections as Section[],
    spine: projected.spine as string[],
    notes: projected.notes as Note[],
  };

  return { book, materialId: row.id };
}
