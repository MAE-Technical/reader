"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { slugifyCategory } from "@/lib/categories/slug";

const ALL_CATEGORY = "All";
// How far one arrow click moves the track — a partial page (not the full
// visible width) so the pill that was at the trailing edge stays partly
// visible after the click, the same "keep your place" scroll YouTube
// Music's own genre chips use rather than a jarring full-width jump.
const SCROLL_STEP_RATIO = 0.8;

type Props = {
  categories: string[];
  selected: string;
};

/**
 * Real `<Link>`s to `/library?q=<slug>` (ALL_CATEGORY -> plain `/library`,
 * no `q`), not PillGroup's usual onClick-a-button pattern — a category is
 * genuinely a different page state worth its own shareable URL (unlike
 * PillGroup's other two callers, CommunityFeedSortToggle's Top/Recent and
 * the reader's own annotation filter, which are just in-place view
 * toggles), so this renders its own pill markup instead of going through
 * PillGroup. Being real anchors gets ctrl/cmd-click-to-new-tab, hover
 * prefetch, and right-click "copy link" for free — a manual onClick +
 * router.replace has to reimplement all three by hand. The library page
 * itself is already a dynamic route reading `searchParams` (`app/(app)/
 * library/page.tsx`), so a click here just re-renders it server-side with
 * the new category pre-filtered in, with (app)/loading.tsx's own Suspense
 * boundary covering the transition — no client-side fetch/loading state
 * needed here at all.
 *
 * The track's native scrollbar is hidden (.no-scrollbar) — it read as
 * clutter riding right under the pills — in favor of one chevron flanking
 * either side of the row itself (< pills >), not floating above or over
 * the pills — same single row, no extra height spent on a control of its
 * own. Each only renders while there's actually more to scroll to in that
 * direction (tracked via the scroll/resize listener below), so the track
 * alone still fills the space at either end once there's nothing further
 * that way. A finger swipe still scrolls the track directly either way —
 * these are a discoverability aid on top of that, not a replacement for it.
 */
export default function CategoryPills({ categories, selected }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // 1px slop: fractional scroll widths (subpixel layout, browser zoom)
    // can leave scrollLeft/scrollWidth off by less than a pixel even when
    // the track is genuinely at rest against an edge.
    function updateEdges() {
      if (!track) return;
      setCanScrollLeft(track.scrollLeft > 1);
      setCanScrollRight(track.scrollLeft + track.clientWidth < track.scrollWidth - 1);
    }

    updateEdges();
    track.addEventListener("scroll", updateEdges, { passive: true });
    // Catches both a viewport resize and the track's own content changing
    // width (e.g. this list of categories loading in) — ResizeObserver
    // covers what a plain window "resize" listener wouldn't.
    const observer = new ResizeObserver(updateEdges);
    observer.observe(track);
    return () => {
      track.removeEventListener("scroll", updateEdges);
      observer.disconnect();
    };
  }, [categories]);

  function scrollBy(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * SCROLL_STEP_RATIO, behavior: "smooth" });
  }

  return (
    <div className="flex items-center gap-2">
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Scroll categories left"
          className="flex h-6 w-6 flex-none items-center justify-center rounded-full border border-[var(--reader-border)] bg-[var(--reader-surface)] text-[var(--reader-text)] cursor-pointer"
        >
          <ChevronLeft size={14} />
        </button>
      )}

      <div
        ref={trackRef}
        className="no-scrollbar min-w-0 flex-1 flex gap-2 overflow-x-auto pb-1 no-callout"
      >
        {[ALL_CATEGORY, ...categories].map((category) => {
          const active = category === selected;
          const href = category === ALL_CATEGORY ? "/library" : `/library?q=${slugifyCategory(category)}`;
          return (
            <Link
              key={category}
              href={href}
              scroll={false}
              className={`flex-none whitespace-nowrap rounded-sm border px-3 py-2 text-xs font-bold cursor-pointer overflow-hidden transition-colors no-underline ${
                active
                  ? "border-brand-500 bg-brand-500 text-white"
                  : "border-[var(--reader-border)] bg-[var(--reader-surface)] text-[var(--reader-text-muted)] hover:bg-[var(--reader-surface-hover)]"
              }`}
            >
              {category}
            </Link>
          );
        })}
      </div>

      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Scroll categories right"
          className="flex h-6 w-6 flex-none items-center justify-center rounded-full border border-[var(--reader-border)] bg-[var(--reader-surface)] text-[var(--reader-text)] cursor-pointer"
        >
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}
