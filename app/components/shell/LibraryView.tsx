"use client";

import { useRef, useState } from "react";
import CategoryPills from "./CategoryPills";
import BookCard from "./BookCard";
import SearchableAppPage from "./SearchableAppPage";
import type { MaterialSummary } from "@/lib/api/types";
import { useContinueReading } from "@/lib/auth/useContinueReading";
import { apiFetch } from "@/lib/api/client";
import Loader from "@/app/components/Loader";

type Props = {
  materials: MaterialSummary[];
  /** `nextCursor` from the server's own first page (`app/(app)/library/
   * page.tsx`, `sort: "alphabetical"`, 24 at a time) — null means that
   * first page was already the whole catalog. */
  initialNextCursor: string | null;
  categories: string[];
};

export default function LibraryView({ materials, initialNextCursor, categories }: Props) {
  const [allItems, setAllItems] = useState(materials);
  const [allNextCursor, setAllNextCursor] = useState(initialNextCursor);
  const [categoryItems, setCategoryItems] = useState<MaterialSummary[]>([]);
  const [categoryNextCursor, setCategoryNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [category, setCategory] = useState<string>("All");
  const activeRequestRef = useRef(0);

  // Populates reading-position-store's local mirror (progress bars on every
  // card below read it) for a reader who lands straight on /library without
  // ever visiting /home first — see useContinueReading's own doc comment.
  useContinueReading();

  const items = category === "All" ? allItems : categoryItems;
  const nextCursor = category === "All" ? allNextCursor : categoryNextCursor;

  async function loadCategoryPage(nextCategory: string, requestId: number) {
    try {
      const params = new URLSearchParams({ sort: "alphabetical", limit: "24", category: nextCategory });
      const page = await apiFetch<{ items: MaterialSummary[]; nextCursor: string | null }>(
        `/materials?${params.toString()}`
      );
      if (requestId !== activeRequestRef.current) return;
      setCategoryItems(page.items);
      setCategoryNextCursor(page.nextCursor);
    } finally {
      if (requestId === activeRequestRef.current) setIsLoadingMore(false);
    }
  }

  async function handleCategorySelect(nextCategory: string) {
    const requestId = ++activeRequestRef.current;
    setCategory(nextCategory);
    if (nextCategory === "All") {
      setIsLoadingMore(false);
      setIsCategoryLoading(false);
      setCategoryItems([]);
      setCategoryNextCursor(null);
      return;
    }

    setIsCategoryLoading(true);
    setIsLoadingMore(true);
    try {
      await loadCategoryPage(nextCategory, requestId);
    } finally {
      if (requestId === activeRequestRef.current) setIsCategoryLoading(false);
    }
  }

  async function loadMore() {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams({ sort: "alphabetical", limit: "24", cursor: nextCursor });
      if (category !== "All") params.set("category", category);
      const page = await apiFetch<{ items: MaterialSummary[]; nextCursor: string | null }>(
        `/materials?${params.toString()}`
      );
      if (category === "All") {
        setAllItems((prev) => [...prev, ...page.items]);
        setAllNextCursor(page.nextCursor);
      } else {
        setCategoryItems((prev) => [...prev, ...page.items]);
        setCategoryNextCursor(page.nextCursor);
      }
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
        <CategoryPills categories={categories} selected={category} onSelect={(nextCategory) => void handleCategorySelect(nextCategory)} />
      </div>

      {isCategoryLoading ? (
        <div className="relative min-h-[360px]">
          <Loader confined />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--reader-text-muted)]">
          {category === "All" ? "No books ingested yet." : `No books tagged "${category}" yet.`}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
            {items.map((material) => (
              <BookCard key={material.id} material={material} />
            ))}
          </div>

          {nextCursor && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={isLoadingMore}
                className="cursor-pointer rounded-sm border border-[var(--reader-border)] bg-[var(--reader-surface)] px-5 py-2 text-[12px] font-semibold text-[var(--reader-text)] disabled:cursor-not-allowed disabled:opacity-50"
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
