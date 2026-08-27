import { resolveMaterialRow } from "@/lib/materials/resolve";
import { projectMaterial } from "@/lib/materials/projection";
import type { TocSection } from "@/lib/api/types";
import { fetchMaterialManifest } from "./manifest";

export type TocTitleNode = {
  title: string | null;
  children: TocTitleNode[];
};

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
  googleCoverUrl: string | null;
  googleThumbnailUrl: string | null;
  googleDescription: string | null;
  googleMetaData: Record<string, unknown> | null;
  language: string | null;
  publishedYear: number | null;
  pageCountEstimate: number | null;
  narratorCount: number;
  spine: string[];
  sections: TocSection[];
  tocTitles: TocTitleNode[];
};

const DETAIL_FIELDS = [
  "title",
  "author",
  "description",
  "cover",
  "googleCoverUrl",
  "googleThumbnailUrl",
  "googleDescription",
  "googleMetaData",
  "language",
  "publishedYear",
  "pageCountEstimate",
  "narratorCount",
  "spine",
  "sections",
  "toc_titles",
];

function tocTitlesFromManifest(nodes: TocSection[]): TocTitleNode[] {
  return nodes.map((node) => ({ title: node.label, children: tocTitlesFromManifest(node.children) }));
}

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

  const [projected, manifest] = await Promise.all([
    projectMaterial(row, { fields: DETAIL_FIELDS.filter((field) => field !== "spine" && field !== "sections" && field !== "toc_titles") }),
    fetchMaterialManifest(row.slug),
  ]);

  return {
    id: row.id,
    slug: row.slug,
    title: projected.title as string,
    author: projected.author as string,
    description: projected.description as string | null,
    cover: projected.cover as string | null,
    googleCoverUrl: projected.googleCoverUrl as string | null,
    googleThumbnailUrl: projected.googleThumbnailUrl as string | null,
    googleDescription: projected.googleDescription as string | null,
    googleMetaData: (projected.googleMetaData as Record<string, unknown> | null) ?? null,
    language: projected.language as string | null,
    publishedYear: projected.publishedYear as number | null,
    pageCountEstimate: projected.pageCountEstimate as number | null,
    narratorCount: projected.narratorCount as number,
    spine: manifest.spine,
    sections: manifest.toc as TocSection[],
    tocTitles: tocTitlesFromManifest(manifest.toc),
  };
}
