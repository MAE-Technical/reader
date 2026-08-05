import type { Metadata } from "next";
import { listPublishedMaterials } from "@/lib/materials/list";
import LibraryView from "@/app/components/shell/LibraryView";

export const metadata: Metadata = {
  title: "Library",
  description: "Browse the full catalog of revolutionary books, essays, and speeches available to read or listen to.",
};

export default async function LibraryPage() {
  // Same direct, no-HTTP-hop call GET /api/materials itself makes — see
  // listPublishedMaterials's own doc comment. First page only (24, the
  // endpoint's own default) ranked by community engagement (`sort: "top"`
  // — each book's public notes, weighted by their reactions); LibraryView
  // fetches subsequent pages itself via its own "Load more" (real cursor
  // pagination, not the old "fetch 100 and filter client-side" shortcut).
  const { items, nextCursor } = await listPublishedMaterials({ limit: 24, sort: "top" });
  return <LibraryView materials={items} initialNextCursor={nextCursor} />;
}
