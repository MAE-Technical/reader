import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { storagePublicUrl } from "@/lib/storage/config";
import { parseBookDocument, type BookDocument } from "@/lib/book/schema";
import { buildPassageIndex, buildSectionsById } from "@/lib/reader/sections";
import { sectionLabel } from "@/lib/reader/sectionHeading";
import { hydrateNotes, type NoteRow } from "./notes";
import type { AnnotationRange, MaterialSummary, Note } from "@/lib/api/types";

export type FeedItem = {
  note: Note;
  material: Pick<MaterialSummary, "id" | "slug" | "title" | "author" | "cover">;
  sectionId: string;
  label: string;
  excerpt: string;
  replyCount: number;
};

/**
 * Turns a page of top-level note rows into full feed items — the
 * material/section/label/excerpt enrichment `GET /api/community/notes` and
 * `GET /api/community/notes/{noteId}` both need (api-spec.md § 3). One
 * Storage fetch per unique material referenced on the page (not per note),
 * and one reply-count query for the whole page.
 */
export async function enrichFeedItems(rows: NoteRow[], callerId: string | undefined): Promise<FeedItem[]> {
  if (rows.length === 0) return [];
  const admin = getSupabaseAdminClient();

  const materialIds = Array.from(new Set(rows.map((r) => r.material_id)));
  const { data: materials } = await admin.from("materials").select("*").in("id", materialIds);
  const materialsById = new Map((materials ?? []).map((m) => [m.id, m]));

  const bookByMaterialId = new Map<string, BookDocument>();
  await Promise.all(
    materialIds.map(async (id) => {
      const material = materialsById.get(id);
      if (!material) return;
      try {
        const res = await fetch(storagePublicUrl(material.json_storage_path));
        if (!res.ok) return;
        const parsed = parseBookDocument(await res.json());
        if (parsed.ok) bookByMaterialId.set(id, parsed.data);
      } catch {
        // Storage hiccup — this material's items fall back to empty
        // section/label/excerpt below rather than failing the whole feed.
      }
    })
  );

  const { data: replyRows } = rows.length
    ? await admin
        .from("notes")
        .select("parent_id")
        .in(
          "parent_id",
          rows.map((r) => r.id)
        )
    : { data: [] };
  const replyCounts = new Map<string, number>();
  for (const r of replyRows ?? []) {
    if (!r.parent_id) continue;
    replyCounts.set(r.parent_id, (replyCounts.get(r.parent_id) ?? 0) + 1);
  }

  const hydratedById = new Map((await hydrateNotes(rows, callerId)).map((n) => [n.id, n]));

  const items: FeedItem[] = [];
  for (const row of rows) {
    const material = materialsById.get(row.material_id);
    const note = hydratedById.get(row.id);
    if (!material || !note) continue;

    let sectionId = "";
    let label = "";
    let excerpt = "";
    const book = bookByMaterialId.get(row.material_id);
    const range = (row.ranges as AnnotationRange[])[0];
    if (book && range) {
      const passageEntry = buildPassageIndex(book.sections).get(range.passageId);
      if (passageEntry) {
        sectionId = passageEntry.sectionId;
        const section = buildSectionsById(book.sections).get(passageEntry.sectionId);
        label = (section && sectionLabel(section)) ?? "";
        excerpt = passageEntry.passage.text.slice(range.start, range.end);
      }
    }

    items.push({
      note,
      material: { id: material.id, slug: material.slug, title: material.title, author: material.author, cover: material.cover_url },
      sectionId,
      label,
      excerpt,
      replyCount: replyCounts.get(row.id) ?? 0,
    });
  }
  return items;
}
