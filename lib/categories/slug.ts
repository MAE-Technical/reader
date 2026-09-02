/**
 * URL-safe form of a category name for `/library?q=<slug>` — no
 * "server-only" here (unlike lib/categories/config.ts): both the library
 * page (resolving the initial category server-side) and LibraryView
 * (writing the URL back out client-side as the reader switches pills) need
 * this same slugify, so it can't live behind that server-only guard.
 */
export function slugifyCategory(category: string): string {
  return category
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The inverse lookup: a `?q=` slug from a shared URL back to the real
 * category string LibraryView/CategoryPills actually work with — matched
 * against every known category's own slugifyCategory output, not decoded
 * structurally, so it's resilient to whatever punctuation a category name
 * happens to contain (e.g. "Marxism & Socialism" -> "marxism-and-socialism").
 * No match (a stale/mistyped slug, or no `q` at all) falls back to "All",
 * the same default CategoryPills itself starts on.
 */
export function resolveCategoryFromSlug(categories: string[], slug: string | null | undefined): string {
  if (!slug) return "All";
  const target = slug.toLowerCase();
  return categories.find((category) => slugifyCategory(category) === target) ?? "All";
}
