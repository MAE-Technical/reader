/** The `cover_source` column's values — which provider's images
 * resolveBookCoverSrc/resolveBookThumbnailSrc try first for a given book.
 * See migrations/20260829_materials_cover_source.sql. */
export type CoverSource = "own" | "openlibrary" | "google";

type BookImageFields = {
  openlibraryThumbnailUrl?: string | null;
  openlibraryCoverUrl?: string | null;
  googleThumbnailUrl?: string | null;
  googleCoverUrl?: string | null;
  thumbnail?: string | null;
  cover?: string | null;
  /** Defaults to "own" (today's fixed priority) when absent. */
  coverSource?: CoverSource | null;
};

const SOURCE_ORDER: CoverSource[] = ["own", "openlibrary", "google"];

function normalizeImageUrl(value?: string | null): string | null {
  const url = value?.trim();
  if (!url) return null;
  return url.replace(/^http:\/\//, "https://");
}

/** Each source's [cover, thumbnail] pair, in that fixed field order. */
function sourceVariants(source: CoverSource, material: BookImageFields): [string | null | undefined, string | null | undefined] {
  switch (source) {
    case "own":
      return [material.cover, material.thumbnail];
    case "openlibrary":
      return [material.openlibraryCoverUrl, material.openlibraryThumbnailUrl];
    case "google":
      return [material.googleCoverUrl, material.googleThumbnailUrl];
  }
}

/** Our own upload first (the one source we fully control), then whichever of
 * OpenLibrary/Google the admin picked via `coverSource` next — falling
 * through the remaining two in their usual order — then the other. See
 * migrations/20260829_materials_cover_source.sql: the preference only ever
 * reorders these three existing sources, never overwrites one. */
function resolutionOrder(coverSource?: CoverSource | null): CoverSource[] {
  const preferred = coverSource && SOURCE_ORDER.includes(coverSource) ? coverSource : "own";
  return [preferred, ...SOURCE_ORDER.filter((source) => source !== preferred)];
}

function resolve(material: BookImageFields, variantFirst: "cover" | "thumbnail"): string | null {
  for (const source of resolutionOrder(material.coverSource)) {
    const [cover, thumbnail] = sourceVariants(source, material);
    const [primary, secondary] = variantFirst === "cover" ? [cover, thumbnail] : [thumbnail, cover];
    const resolved = normalizeImageUrl(primary) ?? normalizeImageUrl(secondary);
    if (resolved) return resolved;
  }
  return null;
}

/** Best image for compact list cards. Widest-variant-last within whichever
 * source wins — OpenLibrary's coverage turned out to have real gaps too
 * (~35% hit rate against this catalogue), so it's not trusted over a
 * first-party image by default, just over Google's inconsistent CDN. */
export function resolveBookThumbnailSrc(material: BookImageFields): string | null {
  return resolve(material, "thumbnail");
}

/** Best image for a detail-page hero cover. Same source priority as the
 * thumbnail, just widest-variant-first within each source. */
export function resolveBookCoverSrc(material: BookImageFields): string | null {
  return resolve(material, "cover");
}
