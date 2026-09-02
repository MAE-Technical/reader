import type { Metadata } from "next";
import { listPublishedMaterials } from "@/lib/materials/list";
import LibraryView from "@/app/components/shell/LibraryView";
import { getCategories } from "@/lib/categories/config";
import { resolveCategoryFromSlug } from "@/lib/categories/slug";

export const metadata: Metadata = {
  title: "Library",
  description: "Browse the full catalog of revolutionary books, essays, and speeches available to read or listen to.",
};

export default async function LibraryPage({
  searchParams,
}: {
  // `?q=<category-slug>` — e.g. `/library?q=pan-africanism` — lets a
  // category be shared as a direct link rather than something only
  // reachable by clicking a pill after landing on the plain /library URL.
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const categories = await getCategories();
  const initialCategory = resolveCategoryFromSlug(categories, q);

  const { items, nextCursor } = await listPublishedMaterials({
    limit: 50,
    sort: "alphabetical",
    category: initialCategory === "All" ? undefined : initialCategory,
  });
  // Same direct, no-HTTP-hop call GET /api/materials itself makes — see
  // listPublishedMaterials's own doc comment. First page only (50, the
  // endpoint's own default limit) in alphabetical order (`sort:
  // "alphabetical"`), pre-filtered to whatever category the URL named.
  // LibraryView fetches subsequent pages (and re-fetches on category
  // switches) itself via its own "Load more"/pill handlers.
  return (
    // Keyed by category: CategoryPills now navigates via real `<Link>`s
    // (see its own doc comment) rather than calling back into this
    // component's state, so a category switch has to remount LibraryView
    // fresh off the new server-rendered props instead of reusing the old
    // instance's stale `items`/`nextCursor` state.
    <LibraryView
      key={initialCategory}
      materials={items}
      initialNextCursor={nextCursor}
      categories={categories}
      category={initialCategory}
    />
  );
}
