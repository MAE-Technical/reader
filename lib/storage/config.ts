// Single bucket for all published book assets (json/covers/images/audio),
// prefixed by kind — see scripts/publish-book.ts for what writes here.
export const STORAGE_BUCKET = "library";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

/** Public CDN URL for an object path inside an arbitrary bucket — the general
 * form behind storagePublicUrl() below. Used directly by anything writing to
 * a bucket other than `library` (e.g. the `voice-notes` bucket — see
 * api-spec.md's voice-notes endpoint and models-spec.md's note on why it's a
 * separate bucket from `library`). */
export function bucketPublicUrl(bucket: string, objectPath: string): string {
  const base = requireEnv("SUPABASE_URL").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${objectPath}`;
}

/** Public CDN URL for an object path inside the `library` bucket, e.g. "books/<slug>.json". */
export function storagePublicUrl(objectPath: string): string {
  return bucketPublicUrl(STORAGE_BUCKET, objectPath);
}
