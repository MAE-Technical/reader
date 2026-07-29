// Single bucket for all published book assets (json/covers/images/audio),
// prefixed by kind — see scripts/publish-book.ts for what writes here.
export const STORAGE_BUCKET = "library";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var ${name}`);
  return value;
}

/** Public CDN URL for an object path inside the bucket, e.g. "books/<slug>.json". */
export function storagePublicUrl(objectPath: string): string {
  const base = requireEnv("SUPABASE_URL").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${STORAGE_BUCKET}/${objectPath}`;
}
