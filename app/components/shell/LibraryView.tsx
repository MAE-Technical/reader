"use client";

import { useMemo, useState } from "react";
import AppHeader from "./AppHeader";
import CategoryPills, { DEFAULT_CATEGORIES } from "./CategoryPills";
import BookCard from "./BookCard";
import type { MaterialSummary } from "@/lib/api/types";
import { useContinueReading } from "@/lib/auth/useContinueReading";
import { useMaterialsSearch } from "@/lib/materials/useMaterialsSearch";
import { apiFetch } from "@/lib/api/client";

type Props = {
  materials: MaterialSummary[];
  /** `nextCursor` from the server's own first page (`app/(app)/library/
   * page.tsx`, `sort: "top"`, 24 at a time) — null means that first page
   * was already the whole catalog. */
  initialNextCursor: string | null;
};

export default function LibraryView({ materials, initialNextCursor }: Props) {
  const [items, setItems] = useState(materials);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORIES[0]);

  // Populates reading-position-store's local mirror (progress bars on every
  // card below read it) for a reader who lands straight on /library without
  // ever visiting /home first — see useContinueReading's own doc comment.
  useContinueReading();

  // A real, catalog-wide query (GET /api/materials?search=, same as
  // SearchModal's home-page mode) — never a client-side filter over
  // whatever page happens to be loaded. That distinction matters here
  // specifically: this page only ever holds however many pages of the
  // (engagement-ranked) browse list "Load more" has pulled in so far, and
  // a book with 30 comrades discussing it that just hasn't clawed its way
  // onto page one yet still needs to turn up by title/author regardless.
  const { results: searchResults, isSearching } = useMaterialsSearch(query, {
    category: category !== "All" ? category : null,
  });
  const isSearchMode = query.trim().length > 0;

  // Browse mode only: "All" is the only category any book currently
  // matches (see CategoryPills's own comment), so there's nothing yet a
  // plain client-side pass over the loaded page can't already do
  // correctly — real server-side `?category=` filtering happens too, once
  // "Load more" fetches a fresh page (see loadMore below).
  const browseItems = useMemo(() => {
    if (category === "All") return items;
    return items.filter((material) => material.categories.includes(category));
  }, [items, category]);

  const visible = isSearchMode ? searchResults : browseItems;

  async function loadMore() {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams({ sort: "top", limit: "24", cursor: nextCursor });
      if (category !== "All") params.set("category", category);
      const page = await apiFetch<{ items: MaterialSummary[]; nextCursor: string | null }>(
        `/materials?${params.toString()}`
      );
      setItems((prev) => [...prev, ...page.items]);
      setNextCursor(page.nextCursor);
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <div className="pb-10">
      <AppHeader searchValue={query} onSearchChange={setQuery} />

      <h1 className="mt-1 mb-4 font-serif text-2xl font-semibold text-[var(--reader-text)]">Library</h1>

      <div className="mb-10">
        <CategoryPills selected={category} onSelect={setCategory} />
      </div>

      {isSearchMode && isSearching && visible.length === 0 ? null : visible.length === 0 ? (
        <p className="text-sm text-[var(--reader-text-muted)]">
          {isSearchMode
            ? "No books match your search."
            : items.length === 0
              ? "No books ingested yet."
              : `No books tagged "${category}" yet.`}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
            {visible.map((material) => (
              <BookCard key={material.id} material={material} />
            ))}
          </div>

          {/* Only browse mode paginates — a typed query already reaches the
              whole catalog in one shot (useMaterialsSearch), so there's no
              further page to load underneath it. */}
          {!isSearchMode && nextCursor && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="cursor-pointer rounded-full border border-[var(--reader-border)] bg-[var(--reader-surface)] px-5 py-2 text-sm font-medium text-[var(--reader-text)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
