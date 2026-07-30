"use client";

import Link from "next/link";
import { useLibraryStore } from "@/stores/library-store";
import { computeBookProgress } from "@/lib/reader/progress";
import type { LibraryBookSummary } from "./libraryBook";

/**
 * Horizontal, bordered row card (wireframe: public/wireframe/main
 * (desktop).png) — cover flush to the card's own left edge, clipped to
 * match the card's own rounded corners by the parent's overflow-hidden
 * rather than rounded on the image itself. Fixed height so every row
 * aligns regardless of a book's own cover aspect ratio, title length, or
 * whether it has a saved position yet — the progress row always renders
 * (0% width, not hidden) so a book with no position doesn't produce a
 * shorter card than its neighbors.
 */
export default function BookCard({ book }: { book: LibraryBookSummary }) {
  const position = useLibraryStore((s) => s.getPosition(book.id));
  const pct = Math.round(computeBookProgress(book.progress, position) * 100);

  return (
    <Link
      href={`/read/${book.slug}`}
      className="group flex h-30 items-stretch overflow-hidden rounded-xs border border-[var(--reader-border)] no-underline transition-colors"
    >
      <img src={book.cover} alt={book.title} className="h-full w-24 p-2 flex-none object-cover" />

      <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
        <div className="min-w-0">
          <div className="line-clamp-2 text-xs font-semibold leading-tight text-[var(--reader-text)] group-hover:text-brand-500">
            {book.title}
          </div>
          <div className="mt-2 truncate text-xs font-semibold text-[var(--reader-text-muted)]">{book.author}</div>
          <div className="mt-2 text-xs font-medium text-[var(--reader-text-subtle)]">{book.pageCountEstimate} pages</div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-[var(--reader-surface-hover)]">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
          </div>
          <span className="flex-none text-xs font-medium text-[var(--reader-text-muted)]">{pct}%</span>
        </div>
      </div>
    </Link>
  );
}
