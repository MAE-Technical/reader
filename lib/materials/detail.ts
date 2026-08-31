import { resolveMaterialRow } from "@/lib/materials/resolve";
import { projectMaterial } from "@/lib/materials/projection";
import type { TocSection } from "@/lib/api/types";
import type { CoverSource } from "@/lib/materials/image";
import { listCurrentReaders } from "@/lib/reader/activity";
import { CURRENT_READERS_DETAIL_CAP } from "@/lib/reader/constants";
import { fetchMaterialManifest } from "./manifest";

export class MaterialNotFoundError extends Error {
  constructor(materialId: string) {
    super(`No published material found for "${materialId}"`);
    this.name = "MaterialNotFoundError";
  }
}

export type MaterialDetail = {
  id: string;
  slug: string;
  title: string;
  author: string;
  description: string | null;
  cover: string | null;
  coverSource: CoverSource;
  googleCoverUrl: string | null;
  googleThumbnailUrl: string | null;
  googleDescription: string | null;
  googleMetaData: Record<string, unknown> | null;
  openlibraryCoverUrl: string | null;
  openlibraryThumbnailUrl: string | null;
  openlibraryDescription: string | null;
  openlibraryMetaData: Record<string, unknown> | null;
  language: string | null;
  publishedYear: number | null;
  pageCountEstimate: number | null;
  narratorCount: number;
  spine: string[];
  sections: TocSection[];
  /** See MaterialSummary's own doc comment (lib/api/types.ts) — same shape,
   * populated below via the same listCurrentReaders batch helper, at
   * CURRENT_READERS_DETAIL_CAP rather than the list page's smaller cap. */
  currentReaders: { readerId: string; pseudonym: string; audioTimeMs: number | null; updatedAt: string }[];
  currentReaderCount: number;
};

const DETAIL_FIELDS = [
  "title",
  "author",
  "description",
  "cover",
  "coverSource",
  "googleCoverUrl",
  "googleThumbnailUrl",
  "googleDescription",
  "googleMetaData",
  "openlibraryCoverUrl",
  "openlibraryThumbnailUrl",
  "openlibraryDescription",
  "openlibraryMetaData",
  "language",
  "publishedYear",
  "pageCountEstimate",
  "narratorCount",
  "spine",
  "sections",
  "toc_titles",
];

/**
 * Everything the book-detail page (`BookDetailView.tsx`) actually reads —
 * api-spec.md's own worked example of a details view served entirely from
 * the `materials` row, zero Storage round trips (no `narrators`/`notes`/
 * `sectionId` requested, so `projectMaterial`'s `needsStorage` gate never
 * fires). Called directly (no HTTP hop) same as `listPublishedMaterials`.
 */
export async function getMaterialDetail(slug: string): Promise<MaterialDetail> {
  const row = await resolveMaterialRow(slug);
  if (!row) throw new MaterialNotFoundError(slug);

  const [projected, manifest, currentReadersByMaterial] = await Promise.all([
    projectMaterial(row, { fields: DETAIL_FIELDS.filter((field) => field !== "spine" && field !== "sections" && field !== "toc_titles") }),
    fetchMaterialManifest(row.slug),
    listCurrentReaders([row.id], CURRENT_READERS_DETAIL_CAP),
  ]);
  const currentReaders = currentReadersByMaterial.get(row.id);

  return {
    id: row.id,
    slug: row.slug,
    title: projected.title as string,
    author: projected.author as string,
    description: projected.description as string | null,
    cover: projected.cover as string | null,
    coverSource: projected.coverSource as CoverSource,
    googleCoverUrl: projected.googleCoverUrl as string | null,
    googleThumbnailUrl: projected.googleThumbnailUrl as string | null,
    googleDescription: projected.googleDescription as string | null,
    googleMetaData: (projected.googleMetaData as Record<string, unknown> | null) ?? null,
    openlibraryCoverUrl: projected.openlibraryCoverUrl as string | null,
    openlibraryThumbnailUrl: projected.openlibraryThumbnailUrl as string | null,
    openlibraryDescription: projected.openlibraryDescription as string | null,
    openlibraryMetaData: (projected.openlibraryMetaData as Record<string, unknown> | null) ?? null,
    language: projected.language as string | null,
    publishedYear: projected.publishedYear as number | null,
    pageCountEstimate: projected.pageCountEstimate as number | null,
    narratorCount: projected.narratorCount as number,
    spine: manifest.spine,
    sections: manifest.toc as TocSection[],
    currentReaders: currentReaders?.readers ?? [],
    currentReaderCount: currentReaders?.totalCount ?? 0,
  };
}
