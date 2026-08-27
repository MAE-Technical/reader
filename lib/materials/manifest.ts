import { storagePublicUrl } from "@/lib/storage/config";
import type { TocSection } from "@/lib/api/types";

export type MaterialManifest = {
  schemaVersion: 1;
  slug: string;
  toc: TocSection[];
  spine: string[];
};

export function manifestStoragePath(slug: string): string {
  return `books/${slug}-manifest.json`;
}

export async function fetchMaterialManifest(slug: string): Promise<MaterialManifest> {
  const path = manifestStoragePath(slug);
  const response = await fetch(storagePublicUrl(path), { next: { revalidate: 300 } });
  if (!response.ok) throw new Error(`Could not fetch material manifest for ${slug} (${response.status})`);
  const value = (await response.json()) as Partial<MaterialManifest>;
  if (value.schemaVersion !== 1 || value.slug !== slug || !Array.isArray(value.toc) || !Array.isArray(value.spine)) {
    throw new Error(`Invalid material manifest for ${slug}`);
  }
  return value as MaterialManifest;
}
