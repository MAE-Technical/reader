"use client";

import Link from "next/link";
import { useLibraryStore } from "@/stores/library-store";
import { computeBookProgress } from "@/lib/reader/progress";
import type { LibraryBookSummary } from "./libraryBook";

/**
 * Cover-forward grid tile (Claude Design "Book Redesign" project — see
 * book-redesign-brief.md). Progress is layered onto the cover itself
 * (bottom overlay) rather than as a caption row, so every card's caption
 * is exactly title+author regardless of progress state — cards in the same
 * grid row stay the same height whether or not they've been started.
 */
export default function BookCard({ book }: { book: LibraryBookSummary }) {
  const position = useLibraryStore((s) => s.getPosition(book.id));
  const pct = Math.round(computeBookProgress(book.progress, position) * 100);
  const showProgress = pct > 0;

  return (
    <Link href={`/book/${book.slug}`} className="group block no-underline">
      <div className="relative overflow-hidden rounded-xs">
        <img
          src={book.cover}
          alt={book.title}
          className="aspect-[2/3] w-full border border-[var(--reader-border)] object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
        />
        {showProgress && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-sand-950/85 via-sand-950/45 to-transparent px-2.5 pb-2 pt-7">
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-brand-400" style={{ width: `${pct}%` }} />
              </div>
              <span className="flex-none text-[10px] font-semibold text-white">
                {pct >= 100 ? "Finished" : `${pct}%`}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-2.5 min-w-0">
        <div className="truncate font-serif text-[15px] font-semibold leading-tight text-[var(--reader-text)] group-hover:text-brand-500">
          {book.title}
        </div>
        <div className="mt-0.5 truncate text-xs font-medium text-[var(--reader-text-muted)]">{book.author}</div>
      </div>
    </Link>
  );
}
