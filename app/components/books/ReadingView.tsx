"use client";

import Link from "next/link";
import SearchableAppPage from "@/app/components/shell/SearchableAppPage";
import { useIsAuthenticated } from "@/lib/auth/useIsAuthenticated";
import { useContinueReading } from "@/lib/auth/useContinueReading";
import ContinueReadingItemCard from "./ContinueReadingItemCard";

export default function ReadingView() {
  const isAuthenticated = useIsAuthenticated();
  const { data: items, isLoading } = useContinueReading();

  return (
    <SearchableAppPage>
      <div className="mt-1 mb-7">
        <h1 className="m-0 font-serif text-2xl font-bold text-[var(--reader-text)]">Book List</h1>
        <p className="mt-1 mb-0 font-literata text-sm text-[var(--reader-text-muted)]">Right where you left off.</p>
      </div>

      {!isAuthenticated ? (
        <p className="text-sm text-[var(--reader-text-muted)]">
          <Link href="/auth/login" className="font-semibold text-[var(--reader-accent)]">Log in</Link> to see your reading list.
        </p>
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-[120px] animate-pulse rounded-sm bg-[var(--reader-surface-hover)]" />)}
        </div>
      ) : !items?.length ? (
        <p className="text-sm text-[var(--reader-text-muted)]">Start a book from the library and it will appear here.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => <ContinueReadingItemCard key={item.material.id} item={item} variant="page" />)}
        </div>
      )}
    </SearchableAppPage>
  );
}
