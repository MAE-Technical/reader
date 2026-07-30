"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play } from "lucide-react";
import type { BookDocument } from "@/lib/book/schema";
import { useLibraryStore } from "@/stores/library-store";
import { useAudioStore } from "@/stores/audio-store";
import { buildProgressShape, computeBookProgress } from "@/lib/reader/progress";
import { buildOutlineRows } from "@/lib/reader/outline";
import { sectionLabel } from "@/lib/reader/sectionHeading";
import ShareButton from "./ShareButton";

const COLLAPSED_CHAPTER_LIMIT = 8;

/**
 * A single ambient hero card (the cover itself, blurred, as backdrop) holds
 * cover, title/author, progress and CTAs together, followed directly by the
 * book's outline — no tabs, no separate notes section. One view, not one
 * managed from two different responsive layouts.
 */
export default function BookDetailView({ book }: { book: BookDocument }) {
  const router = useRouter();
  const position = useLibraryStore((s) => s.getPosition(book.id));
  const openBook = useAudioStore((s) => s.openBook);
  const [showAllChapters, setShowAllChapters] = useState(false);

  // library-store skips automatic persist hydration (see its own doc
  // comment) — rehydrated here the same way Reader.tsx/LibraryView do,
  // since this page reads a real saved position for its own progress bar.
  useEffect(() => {
    useLibraryStore.persist.rehydrate();
  }, []);

  const progressShape = useMemo(() => buildProgressShape(book), [book]);
  const pct = Math.round(computeBookProgress(progressShape, position) * 100);
  const hasNarration = book.narrators.length > 0;
  // `position` is one shared resume record for both reading and listening
  // (see stores/library-store.ts's Position type) — reading never writes
  // `audioTimeMs`, only NarrationEngine does (always, even at 0ms when
  // playback starts), so its presence is what actually distinguishes "has
  // listened before" from "has only ever read this book."
  const hasListened = position?.audioTimeMs !== undefined;

  // Exactly the same rows the reader's own TOC drawer (ChaptersDrawer) shows
  // — group rows for Parts, leaf rows for every chapter, in the tree's own
  // order — so this page can't drift into a different, incomplete notion of
  // "the book's contents" than the one used while actually reading.
  //
  // Deliberately NOT split by Section.kind (front/body/back) — across the
  // real ingested corpus that field is unreliable (most books tag nearly
  // everything "unknown", so a body chapter and a title page are often
  // indistinguishable by kind alone). Splitting on it previously scattered
  // real chapters into a "front matter" bucket and stripped their part
  // grouping. The tree's own hierarchy is the only structure this data
  // reliably carries: a row with children is a Part (colored), a leaf is a
  // chapter (muted) — nothing else is inferred.
  const outlineRows = useMemo(() => buildOutlineRows(book.sections), [book.sections]);
  const totalChapterCount = useMemo(() => outlineRows.filter((r) => !r.isGroup).length, [outlineRows]);
  const visibleOutlineRows = useMemo(() => {
    if (showAllChapters || totalChapterCount <= COLLAPSED_CHAPTER_LIMIT) return outlineRows;
    const rows: typeof outlineRows = [];
    let chapterCount = 0;
    for (const row of outlineRows) {
      if (!row.isGroup) {
        if (chapterCount >= COLLAPSED_CHAPTER_LIMIT) break;
        chapterCount++;
      }
      rows.push(row);
    }
    return rows;
  }, [outlineRows, showAllChapters, totalChapterCount]);

  const metaLine = [
    book.metadata.publishedYear ? String(book.metadata.publishedYear) : null,
    `${book.metadata.pageCountEstimate} pages`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="pb-12 min-[860px]:mx-auto min-[860px]:max-w-3xl">
      <div className="flex items-center justify-between py-5">
        <Link
          href="/library"
          aria-label="Back to library"
          className="flex items-center justify-center text-[var(--reader-text)] no-underline"
        >
          <ArrowLeft size={20} />
        </Link>
        <ShareButton title={book.metadata.title} text={`${book.metadata.title} by ${book.metadata.author}`} />
      </div>

      <div className="relative mb-8 rounded-sm overflow-hidden bg-[var(--reader-surface-hover)]">
        <img
          src={book.metadata.cover}
          alt=""
          aria-hidden="true"
          className="absolute -inset-8 h-[calc(100%+64px)] w-[calc(100%+64px)] scale-110 object-cover opacity-40 blur-[50px]"
        />
        <div className="relative bg-[var(--reader-bg)]/55 p-6 min-[860px]:p-10">
          <div className="flex flex-col items-start gap-5 min-[860px]:flex-row min-[860px]:items-center min-[860px]:gap-9">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={book.metadata.cover}
              alt={book.metadata.title}
              className="aspect-[2/3] w-36 flex-none rounded-xs object-cover shadow-lg min-[860px]:w-56"
            />
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-2xl font-semibold leading-tight text-[var(--reader-text)] min-[860px]:text-3xl">
                {book.metadata.title}
              </h1>
              <div className="mt-1.5 text-base font-medium text-[var(--reader-text-muted)]">{book.metadata.author}</div>
              {metaLine && <div className="mt-2.5 text-xs text-[var(--reader-text-subtle)]">{metaLine}</div>}
              <div className="mt-3.5 grid max-w-[250px] gap-3">
              <Link
                href={`/read/${book.slug}`}
                className="rounded-md bg-brand-500 px-5 py-2.5 text-center text-sm font-semibold text-white no-underline hover:bg-brand-600"
              >
                {pct > 0 ? "Resume reading" : "Start reading"}
              </Link>

              {hasNarration && (
                <button
                  onClick={() => {
                    openBook(book);
                    router.push(`/read/${book.slug}`);
                  }}
                  className="flex items-center cursor-pointer justify-center gap-2 rounded-md border border-[var(--reader-border)] bg-transparent px-5 py-2.5 text-sm font-semibold text-[var(--reader-text)] hover:bg-[var(--reader-surface)]"
                >
                  <Play size={16} />
                  {hasListened ? "Continue Playing" : "Listen (Audiobook)"}
                </button>
              )}
            </div>
            </div>
          </div>

          <div className="mt-6">
            {pct > 0 && (
              <div className="mb-3 flex items-center gap-3">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--reader-surface)]">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="flex-none text-xs font-semibold text-[var(--reader-text-muted)]">
                  {pct}% complete
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mb-3.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--reader-text-subtle)]">
        Book Outline
      </div>

      <div className="flex flex-col">
        {visibleOutlineRows.map((row) => {
          if (row.isGroup) {
            return (
              <div
                key={row.section.id}
                className="mb-0.5 mt-4 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-brand-500 first:mt-0"
              >
                {sectionLabel(row.section)}
              </div>
            );
          }
          const hasContent = row.section.passages.length > 0;
          const label = sectionLabel(row.section);
          if (!hasContent) {
            return (
              <div key={row.section.id} className="truncate px-2.5 py-2 text-sm font-medium text-[var(--reader-text-muted)] opacity-50">
                {label}
              </div>
            );
          }
          return (
            <Link
              key={row.section.id}
              href={`/read/${book.slug}?section=${row.section.id}`}
              className="block truncate rounded-xs px-2.5 py-2 text-sm font-medium text-[var(--reader-text-muted)] no-underline hover:bg-[var(--reader-surface-hover)] hover:text-[var(--reader-text)]"
            >
              {label}
            </Link>
          );
        })}

        {totalChapterCount > COLLAPSED_CHAPTER_LIMIT && (
          <button
            onClick={() => setShowAllChapters((v) => !v)}
            className="mt-3 cursor-pointer self-start rounded-none border-none bg-transparent px-2.5 text-sm font-semibold text-brand-500 hover:text-brand-600"
          >
            {showAllChapters ? "Show less" : "See all"}
          </button>
        )}
      </div>
    </div>
  );
}
