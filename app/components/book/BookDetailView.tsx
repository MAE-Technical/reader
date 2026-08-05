"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Play } from "lucide-react";
import type { MaterialDetail } from "@/lib/materials/detail";
import { useReadingPositionStore } from "@/stores/reading-position-store";
import { useContinueReading } from "@/lib/auth/useContinueReading";
import { buildTocOutlineRows } from "@/lib/reader/tocOutline";
import ShareButton from "./ShareButton";
import ReaderLink from "../ReaderLink";

const COLLAPSED_CHAPTER_LIMIT = 8;

/**
 * A single ambient hero card (the cover itself, blurred, as backdrop) holds
 * cover, title/author, progress and CTAs together, followed directly by the
 * book's outline — no tabs, no separate notes section. One view, not one
 * managed from two different responsive layouts.
 *
 * Served entirely from `materials.detail`'s DB-only fields (api-spec.md's
 * own worked example for this exact page) — no `BookDocument`, no Storage
 * round trip. Progress comes from reading-position-store's
 * `progressPercentByMaterial`, itself already server-computed
 * (`CurrentReadingEntry.progressPercent`) and mirrored locally by
 * useContinueReading — not recomputed here from spine/passage counts.
 */
export default function BookDetailView({ material }: { material: MaterialDetail }) {
  // Ensures the position mirror is populated even for a reader who lands
  // straight on this page (a shared link, a search-engine hit) without ever
  // visiting /home first — see useContinueReading's own hydration effect.
  // The returned list itself isn't needed here, only its side effect.
  useContinueReading();
  const pct = Math.round(useReadingPositionStore((s) => s.progressPercentByMaterial[material.id] ?? 0));
  const position = useReadingPositionStore((s) => s.positions[material.id]);
  const [showAllChapters, setShowAllChapters] = useState(false);

  const hasNarration = material.narratorCount > 0;
  // `position` is one shared resume record for both reading and listening
  // (see stores/reading-position-store.ts's Position type) — reading never
  // writes `audioTimeMs`, only NarrationEngine does (always, even at 0ms
  // when playback starts), so its presence is what actually distinguishes
  // "has listened before" from "has only ever read this book."
  const hasListened = position?.audioTimeMs !== undefined;

  // Exactly the same rows the reader's own TOC drawer (ChaptersDrawer) shows
  // (there, off the full Section[] tree — see lib/reader/outline.ts) — group
  // rows for Parts, leaf rows for every chapter, in the tree's own order.
  const outlineRows = useMemo(() => buildTocOutlineRows(material.sections), [material.sections]);
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

  const metaLine = [material.publishedYear ? String(material.publishedYear) : null, `${material.pageCountEstimate ?? 0} pages`]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="pb-12 shell:mx-auto shell:max-w-3xl">
      <div className="flex items-center justify-between py-5">
        <Link
          href="/library"
          aria-label="Back to library"
          className="flex items-center justify-center text-[var(--reader-text)] no-underline"
        >
          <ArrowLeft size={20} />
        </Link>
        <ShareButton title={material.title} text={`${material.title} by ${material.author}`} />
      </div>

      <div className="relative mb-8 rounded-sm overflow-hidden bg-[var(--reader-surface-hover)]">
        <img
          src={material.cover ?? ""}
          alt=""
          aria-hidden="true"
          className="absolute -inset-8 h-[calc(100%+64px)] w-[calc(100%+64px)] scale-110 object-cover opacity-40 blur-[50px]"
        />
        <div className="relative bg-[var(--reader-bg)]/55 p-6 shell:p-10">
          <div className="flex flex-col items-start gap-5 shell:flex-row shell:items-center shell:gap-9">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={material.cover ?? ""}
              alt={material.title}
              className="aspect-[2/3] w-36 flex-none rounded-xs object-cover shadow-lg shell:w-56"
            />
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-2xl font-semibold leading-tight text-[var(--reader-text)] shell:text-3xl">
                {material.title}
              </h1>
              <div className="mt-1.5 text-base font-medium text-[var(--reader-text-muted)]">{material.author}</div>
              {metaLine && <div className="mt-2.5 text-xs text-[var(--reader-text-subtle)]">{metaLine}</div>}

              <div className="mt-3.5">
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
              <div className="mt-3.5 grid max-w-[250px] gap-3">
              <ReaderLink
                href={`/read/${material.slug}`}
                className="rounded-md bg-brand-500 px-5 py-2.5 text-center text-sm font-semibold text-white no-underline hover:bg-brand-600"
              >
                {pct > 0 ? "Resume reading" : "Start reading"}
              </ReaderLink>

              {hasNarration && (
                // ?listen=1 rather than calling openBook(book) directly —
                // this is a real navigation (ReaderLink), and audio-store's
                // `book` field isn't persisted (only `speed` is), so
                // setting it before the page unloads would just lose it.
                // Reader.tsx picks the flag up on mount and calls openBook
                // itself instead, the same handoff targetSectionId/
                // targetPassageId already do for "jump to this chapter"/
                // "open this note" links.
                <ReaderLink
                  href={`/read/${material.slug}?listen=1`}
                  className="flex items-center cursor-pointer justify-center gap-2 rounded-md border border-[var(--reader-border)] bg-transparent px-5 py-2.5 text-sm font-semibold text-[var(--reader-text)] no-underline hover:bg-[var(--reader-surface)]"
                >
                  <Play size={16} />
                  {hasListened ? "Continue playing" : "Listen (audiobook)"}
                </ReaderLink>
              )}
            </div>
            </div>
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
                {row.section.label}
              </div>
            );
          }
          const hasContent = row.section.passageCount > 0;
          const label = row.section.label;
          if (!hasContent) {
            return (
              <div key={row.section.id} className="truncate px-2.5 py-2 text-sm font-medium text-[var(--reader-text-muted)] opacity-50">
                {label}
              </div>
            );
          }
          return (
            <ReaderLink
              key={row.section.id}
              href={`/read/${material.slug}?section=${row.section.id}`}
              className="block truncate rounded-xs px-2.5 py-2 text-sm font-medium text-[var(--reader-text-muted)] no-underline hover:bg-[var(--reader-surface-hover)] hover:text-[var(--reader-text)]"
            >
              {label}
            </ReaderLink>
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
