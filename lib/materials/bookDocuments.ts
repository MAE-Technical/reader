import { storagePublicUrl } from "@/lib/storage/config";
import { parseBookDocument, type BookDocument } from "@/lib/book/schema";

/**
 * Loads and parses each material's own Storage-hosted BookDocument, one
 * Storage fetch per material — the enrichment step every excerpt-hydrating
 * route needs (a note/highlight's `ranges` only resolve to real quoted text
 * against the book's own passage tree, see lib/community/excerpt.ts's
 * resolveExcerpt). Takes already-fetched material rows rather than
 * querying by id itself, so a caller that already selected
 * `json_storage_path` alongside the columns it actually needs (lib/
 * community/feed.ts's enrichFeedItems, lib/reader/profile.ts's highlights
 * enrichment) doesn't pay for a second materials round trip just to get it.
 * Falls back to leaving a material's id out of the returned map on any
 * per-material Storage hiccup — callers already treat a missing entry as
 * "resolve to empty" (see resolveExcerpt).
 */
export async function loadBookDocuments(
  materials: { id: string; json_storage_path: string }[]
): Promise<Map<string, BookDocument>> {
  const bookByMaterialId = new Map<string, BookDocument>();
  await Promise.all(
    materials.map(async (material) => {
      try {
        const res = await fetch(storagePublicUrl(material.json_storage_path));
        if (!res.ok) return;
        const parsed = parseBookDocument(await res.json());
        if (parsed.ok) bookByMaterialId.set(material.id, parsed.data);
      } catch {
        // Storage hiccup — this material's items fall back to empty
        // section/label/excerpt (resolveExcerpt) rather than failing the
        // whole batch.
      }
    })
  );
  return bookByMaterialId;
}
