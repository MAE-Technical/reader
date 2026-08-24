"use client";

import { useContinueReading } from "@/lib/auth/useContinueReading";
import ContinueReadingItemCard from "./ContinueReadingItemCard";

/** A deliberately bounded shelf so a long reading history never takes over
 * the desktop navigation rail. */
export default function SidebarContinueReading() {
  const { data: items, isLoading } = useContinueReading();

  if (!isLoading && (!items || items.length === 0)) return null;

  return (
    <section className="mt-5 border-t border-[var(--reader-border)] pt-4">
      <h2 className="mb-2 px-2.5 text-xs font-semibold uppercase text-[var(--reader-text-muted)]">Book List</h2>
      <div className="max-h-120 om-scroll space-y-1 overflow-y-auto overscroll-y-contain pr-1">
        {isLoading
          ? Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-[72px] animate-pulse rounded-sm bg-[var(--reader-surface-hover)]" />
            ))
          : items!.map((item) => <ContinueReadingItemCard key={item.material.id} item={item} variant="sidebar" />)}
      </div>
    </section>
  );
}
