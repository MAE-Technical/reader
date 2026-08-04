"use client";

import Link from "next/link";
import { useShallow } from "zustand/react/shallow";
import { useLibraryStore } from "@/stores/library-store";
import { computeBookProgress } from "@/lib/reader/progress";
import type { LibraryBookSummary } from "@/app/components/shell/libraryBook";

function ContinueReadingCard({ book }: { book: LibraryBookSummary }) {
  const position = useLibraryStore((s) => s.getPosition(book.id));
  const pct = Math.round(computeBookProgress(book.progress, position) * 100);

  return (
    <Link
      href={`/read/${book.slug}`}
      className="flex w-60 md:w-70 flex-none gap-3 rounded-sm border border-[var(--reader-border)] bg-[var(--reader-surface)] p-3 no-underline"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={book.cover}
        alt={book.title}
        className="h-20 w-17 flex-none rounded-sm border border-[var(--reader-border)] object-cover"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="min-w-0">
          <div className="truncate font-serif text-sm font-semibold leading-tight text-[var(--reader-text)]">
            {book.title}
          </div>
          <div className="mt-0.5 truncate text-xs font-medium text-[var(--reader-text-muted)]">{book.author}</div>
        </div>
        <div className="mt-auto flex flex-col gap-1.5">
          <div className="h-1 overflow-hidden rounded-full bg-[var(--reader-surface-hover)]">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[11px] font-medium text-[var(--reader-text-muted)]">{pct}% complete</div>
        </div>
      </div>
    </Link>
  );
}


export default function ContinueReadingRail({ books }: { books: LibraryBookSummary[] }) {
  const hasHydrated = useLibraryStore((s) => s.hasHydrated);
  const progressByBook = useLibraryStore(
    useShallow((s) => books.map((book) => computeBookProgress(book.progress, s.books[book.id]?.position)))
  );

  if (!hasHydrated) return null;

  const inProgress = books.filter((_, i) => progressByBook[i] > 0);
  if (inProgress.length === 0) return null;

  return (
    <section className="mb-10">
      <div className="mb-5">
        <h2 className="m-0 font-serif text-xl font-bold text-[var(--reader-text)]">Continue reading</h2>
        <p className="mt-1 mb-0 font-literata text-sm font-medium text-[var(--reader-text-muted)]">Right where you left off.</p>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {inProgress.map((book) => (
          <ContinueReadingCard key={book.id} book={book} />
        ))}
      </div>
    </section>
  );
}
