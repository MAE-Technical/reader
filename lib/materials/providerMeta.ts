import type { Json } from "@/lib/supabase/database.types";

/** Shape written by scripts/generate-material-google-metadata.ts. `isbn` lives here
 * (not a standalone column) since it only ever needs to be read alongside the rest of
 * Google's response, and filtered via `google_meta_data->>'isbn'` (see the two
 * generate-material-*-metadata.ts scripts and the index in
 * migrations/20260829_materials_provider_metadata.sql). */
export type GoogleMetaData = {
  googleBooksId: string | null;
  isbn: string | null;
  coverUrl: string | null;
  thumbnailUrl: string | null;
  description: string | null;
};

/** Shape written by scripts/generate-material-openlibrary-metadata.ts. */
export type OpenLibraryMetaData = {
  coverUrl: string | null;
  thumbnailUrl: string | null;
  description: string | null;
};

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function parseGoogleMetaData(json: Json | null | undefined): GoogleMetaData {
  const obj = (json ?? {}) as Record<string, unknown>;
  return {
    googleBooksId: str(obj.googleBooksId),
    isbn: str(obj.isbn),
    coverUrl: str(obj.coverUrl),
    thumbnailUrl: str(obj.thumbnailUrl),
    description: str(obj.description),
  };
}

export function parseOpenLibraryMetaData(json: Json | null | undefined): OpenLibraryMetaData {
  const obj = (json ?? {}) as Record<string, unknown>;
  return {
    coverUrl: str(obj.coverUrl),
    thumbnailUrl: str(obj.thumbnailUrl),
    description: str(obj.description),
  };
}
