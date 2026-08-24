"use client";

import { useRandomBooks } from "@/lib/general/useRandomBooks";
import type { MaterialSummary } from "@/lib/api/types";
import ReaderLink from "@/app/components/ReaderLink";

function TopBookCard({ material }: { material: MaterialSummary }) {
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
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
        <div className="truncate font-serif text-sm font-semibold leading-tight text-[var(--reader-text)]">
          {material.title}
        </div>
        <div className="mt-0.5 truncate text-xs font-medium text-[var(--reader-text-muted)]">{material.author}</div>
      </div>
    </ReaderLink>
  );
}

/**
 * "Top books" — a random 5-book sample of the published catalog (`GET
 * /api/general/random-books`), rendered right after ContinueReadingRail in
 * the same horizontal-scroll shelf shape. Deliberately not personalized or
 * ranked by anything (see useRandomBooks/lib/materials/random.ts) — just a
 * lightweight way to surface books a reader hasn't necessarily started yet.
 * Unlike ContinueReadingRail, this has no auth gate and always attempts to
 * load, so it still renders for a signed-out visitor.
 */
export default function TopBooksRail() {
  const { data: items, isLoading } = useRandomBooks(5);

  if (!isLoading && (!items || items.length === 0)) return null;

  return (
    <section className="mb-15">
      <div className="mb-5">
        <h2 className="m-0 font-serif text-xl font-bold text-[var(--reader-text)]">Suggested books</h2>
        {/* <p className="mt-1 mb-0 font-literata text-sm text-[var(--reader-text-muted)]">
          A handful worth starting next.
        </p> */}
      </div>
      {isLoading ? (
        <div className="flex gap-4 overflow-x-auto pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-[104px] w-60 flex-none animate-pulse rounded-sm border border-[var(--reader-border)] bg-[var(--reader-surface-hover)] md:w-70"
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items!.map((material) => (
            <TopBookCard key={material.id} material={material} />
          ))}
        </div>
      )}
    </section>
  );
}
