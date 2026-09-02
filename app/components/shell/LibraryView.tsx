"use client";

import { useState } from "react";
import CategoryPills from "./CategoryPills";
import BookListRow from "./BookListRow";
import SearchableAppPage from "./SearchableAppPage";
import type { MaterialSummary } from "@/lib/api/types";
import { useContinueReading } from "@/lib/auth/useContinueReading";
import { apiFetch } from "@/lib/api/client";

const PAGE_SIZE = 50;

type Props = {
  materials: MaterialSummary[];
  /** `nextCursor` from the server's own first page (`app/(app)/library/
   * page.tsx`, `sort: "alphabetical"`, 50 at a time, already filtered to
   * `category`) — null means that first page was already everything in
   * this category. */
  initialNextCursor: string | null;
  categories: string[];
  /** Resolved server-side from the URL's own `?q=<slug>` (see
   * resolveCategoryFromSlug in page.tsx) — "All" when there's no `q`, or it
   * doesn't match a known category. Switching category is a real
   * navigation now (CategoryPills renders `<Link>`s straight to `/library?
   * q=...`), so this only ever changes via a fresh mount of this component
   * — page.tsx keys it by category for exactly that reason — never via
   * local state here. */
  category: string;
};

export default function LibraryView({ materials, initialNextCursor, categories, category }: Props) {
  const [items, setItems] = useState(materials);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Populates reading-position-store's local mirror (progress bars on every
  // card below read it) for a reader who lands straight on /library without
  // ever visiting /home first — see useContinueReading's own doc comment.
  useContinueReading();

  async function loadMore() {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams({ sort: "alphabetical", limit: String(PAGE_SIZE), cursor: nextCursor });
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
    <SearchableAppPage>

      <div className="mt-1 mb-7">
        <h1 className="m-0 font-serif text-2xl font-bold text-[var(--reader-text)]">Library</h1>
      </div>

      <div className="mb-10">
        <CategoryPills categories={categories} selected={category} />
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--reader-text-muted)]">
          {category === "All" ? "No books ingested yet." : `No books tagged "${category}" yet.`}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 shell:grid-cols-2 shell:gap-x-10">
            {items.map((material) => (
              <BookListRow key={material.id} material={material} />
            ))}
          </div>

          {nextCursor && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="cursor-pointer rounded-xs border border-[var(--reader-border)] bg-[var(--reader-surface)] px-[22px] py-2.5 text-[12px] font-bold text-[var(--reader-text)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </SearchableAppPage>
  );
}
