"use client";

import { useContinueReading, type ContinueReadingItem } from "@/lib/auth/useContinueReading";
import ReaderLink from "@/app/components/ReaderLink";

function ContinueReadingCard({ item }: { item: ContinueReadingItem }) {
  const { material, progressPercent } = item;
  return (
    <ReaderLink
      href={`/read/${material.slug}`}
      className="flex w-60 md:w-70 flex-none gap-3 rounded-sm border border-[var(--reader-border)] bg-[var(--reader-surface)] p-3 no-underline"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={material.cover ?? ""}
        alt={material.title}
        className="h-20 w-17 flex-none rounded-sm border border-[var(--reader-border)] object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="min-w-0">
          <div className="truncate font-serif text-sm font-semibold leading-tight text-[var(--reader-text)]">
            {material.title}
          </div>
          <div className="mt-0.5 truncate text-xs font-medium text-[var(--reader-text-muted)]">{material.author}</div>
        </div>
        <div className="mt-auto flex flex-col gap-1.5">
          <div className="h-1 overflow-hidden rounded-full bg-[var(--reader-surface-hover)]">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.round(progressPercent)}%` }} />
          </div>
          <div className="text-[11px] font-medium text-[var(--reader-text-muted)]">
            {Math.round(progressPercent)}% complete
          </div>
        </div>
      </div>
    </ReaderLink>
  );
}

/**
 * `GET /api/auth/me/continue-reading` — self-fetching now (Phase 6), rather
 * than taking a `books` prop derived from a full local library listing: the
 * endpoint already returns exactly the shelf (sorted, filtered to
 * in-progress, each entry pre-joined with its own MaterialSummary), so
 * there's no client-side filtering/progress computation left to do here.
 * Renders nothing at all for an unauthenticated visitor — the query itself
 * never fires (see useContinueReading) since there's no `readers` row yet
 * to read a shelf from.
 */
export default function ContinueReadingRail() {
  const { data: items, isLoading } = useContinueReading();

  // isLoading (not just "!items"): useContinueReading's own query only
  // fires when authenticated at all (see its doc comment), so a
  // signed-out visitor's query never enters a loading state and this
  // still renders nothing for them — only a real in-flight fetch shows
  // the skeleton below rather than the section just not existing yet.
  if (!isLoading && (!items || items.length === 0)) return null;

  return (
    <section className="mb-10">
      <div className="mb-5">
        <h2 className="m-0 font-serif text-xl font-bold text-[var(--reader-text)]">Continue reading</h2>
        <p className="mt-1 mb-0 font-literata text-sm text-[var(--reader-text-muted)]">Right where you left off.</p>
      </div>
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[104px] w-60 flex-none animate-pulse rounded-sm border border-[var(--reader-border)] bg-[var(--reader-surface-hover)] md:w-70"
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items!.map((item) => (
            <ContinueReadingCard key={item.material.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
