type BookImageFields = {
  googleThumbnailUrl?: string | null;
  googleCoverUrl?: string | null;
  thumbnail?: string | null;
  cover?: string | null;
};

function normalizeImageUrl(value?: string | null): string | null {
  const url = value?.trim();
  if (!url) return null;
  return url.replace(/^http:\/\//, "https://");
}

/** Best image for compact list cards. Google thumbnail first, then the
 * existing local thumbnail, then wider cover variants. */
export function resolveBookThumbnailSrc(material: BookImageFields): string | null {
  return (
    normalizeImageUrl(material.googleThumbnailUrl) ??
    normalizeImageUrl(material.googleCoverUrl) ??
    normalizeImageUrl(material.thumbnail) ??
    normalizeImageUrl(material.cover)
  );
}

/** Best image for a detail-page hero cover. Google cover first, then the
 * existing local cover, then thumbnail variants as a fallback. */
export function resolveBookCoverSrc(material: BookImageFields): string | null {
  return (
    normalizeImageUrl(material.googleCoverUrl) ??
    normalizeImageUrl(material.googleThumbnailUrl) ??
    normalizeImageUrl(material.cover) ??
    normalizeImageUrl(material.thumbnail)
  );
}
