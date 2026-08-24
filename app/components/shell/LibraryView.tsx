"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import CategoryPills, { DEFAULT_CATEGORIES } from "./CategoryPills";
import BookCard from "./BookCard";
import SearchableAppPage from "./SearchableAppPage";
import type { MaterialSummary } from "@/lib/api/types";
import { useContinueReading } from "@/lib/auth/useContinueReading";
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
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORIES[0]);

  // Populates reading-position-store's local mirror (progress bars on every
  // card below read it) for a reader who lands straight on /library without
  // ever visiting /home first — see useContinueReading's own doc comment.
  useContinueReading();

  // Browse mode only: "All" is the only category any book currently
  // matches (see CategoryPills's own comment), so there's nothing yet a
  // plain client-side pass over the loaded page can't already do
  // correctly — real server-side `?category=` filtering happens too, once
  // "Load more" fetches a fresh page (see loadMore below).
  const browseItems = useMemo(() => {
    if (category === "All") return items;
    return items.filter((material) => material.categories.includes(category));
  }, [items, category]);

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
    <SearchableAppPage>

      <div className="mt-1 mb-7">
        <h1 className="m-0 font-serif text-2xl font-bold text-[var(--reader-text)]">Library</h1>
        {/* <p className="mt-1.5 mb-0 text-[14px] text-[var(--reader-text-muted)]">
          Have books to share with comrades? <Link href="/share-books" className="font-semibold text-[var(--reader-accent)]">Share books</Link>.
        </p> */}
      </div>

      <div className="mb-10">
        <CategoryPills selected={category} onSelect={setCategory} />
      </div>

      {browseItems.length === 0 ? (
        <p className="text-sm text-[var(--reader-text-muted)]">
          {items.length === 0 ? "No books ingested yet." : `No books tagged "${category}" yet.`}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
            {browseItems.map((material) => (
              <BookCard key={material.id} material={material} />
            ))}
          </div>

          {nextCursor && (
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
    </SearchableAppPage>
  );
}
