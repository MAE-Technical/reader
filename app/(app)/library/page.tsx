import type { Metadata } from "next";
import { listPublishedMaterials } from "@/lib/materials/list";
import LibraryView from "@/app/components/shell/LibraryView";
import { getCategories } from "@/lib/categories/config";

export const metadata: Metadata = {
  title: "Library",
  description: "Browse the full catalog of revolutionary books, essays, and speeches available to read or listen to.",
};

export default async function LibraryPage() {
  const [categories, { items, nextCursor }] = await Promise.all([
    getCategories(),
    listPublishedMaterials({ limit: 24, sort: "alphabetical" }),
  ]);
  // Same direct, no-HTTP-hop call GET /api/materials itself makes — see
  // listPublishedMaterials's own doc comment. First page only (24, the
  // endpoint's own default limit) in alphabetical order (`sort:
  // "alphabetical"`). LibraryView fetches subsequent pages itself via its
  // own "Load more" (real cursor pagination, not the old "fetch 100 and
  // filter client-side" shortcut).
  return <LibraryView materials={items} initialNextCursor={nextCursor} categories={categories} />;
}
