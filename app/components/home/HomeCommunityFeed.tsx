"use client";

import { useEffect } from "react";
import AppHeader from "@/app/components/shell/AppHeader";
import { useLibraryStore } from "@/stores/library-store";
import { useCommunityFeed } from "@/lib/home/useCommunityFeed";
import type { CommunityBookMeta } from "@/lib/home/communityBook";
import type { LibraryBookSummary } from "@/app/components/shell/libraryBook";
import ContinueReadingRail from "./ContinueReadingRail";
import CommunityFeedSortToggle from "./CommunityFeedSortToggle";
import CommunityNoteCard from "./CommunityNoteCard";
import HomeAuthBanner from "./HomeAuthBanner";
import HomeInstallBanner from "./HomeInstallBanner";

/** The home page's real content — a "continue reading" shelf, then every
 * note the local reader has left across their whole library, newest first
 * by default. Same page-composition shape as LibraryView (AppHeader, then
 * a page heading + a filter control, then the content). */
export default function HomeCommunityFeed({
  booksMeta,
  continueReadingBooks,
}: {
  booksMeta: CommunityBookMeta[];
  continueReadingBooks: LibraryBookSummary[];
}) {
  // library-store skips automatic persist hydration (see its own doc
  // comment) so the server and first client paint agree — rehydrated here
  // the same way LibraryView/Reader.tsx already do.
  useEffect(() => {
    useLibraryStore.persist.rehydrate();
  }, []);
  // Gates the empty-state message specifically — without this, a reader
  // who *does* have notes would see a false "No notes yet" flash before
  // localStorage finishes loading a moment later.
  const hasHydrated = useLibraryStore((s) => s.hasHydrated);

  const { items, sort, setSort } = useCommunityFeed(booksMeta);

  return (
    <div className="pb-10">
      <AppHeader />

      <HomeAuthBanner />
      <HomeInstallBanner />

      <ContinueReadingRail books={continueReadingBooks} />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="m-0 font-serif text-xl font-bold text-[var(--reader-text)]">Community notes</h1>
          <p className="mt-1 mb-0 font-literata text-sm font-medium text-[var(--reader-text-muted)]">
            What comrades are discussing across the library right now.
          </p>
        </div>
        {items.length > 0 && <CommunityFeedSortToggle mode={sort} onChange={setSort} />}
      </div>

      {!hasHydrated ? null : items.length === 0 ? (
        <p className="text-sm text-[var(--reader-text-muted)]">No notes yet — annotate a passage to start the discourse.</p>
      ) : (
        // A 2-column masonry on desktop (CSS multi-column, not CSS Grid —
        // no broadly-supported grid masonry mode exists yet) rather than a
        // single column, since card height varies a lot here: voice vs.
        // text notes, and however many replies happen to be expanded.
        // Multi-column re-flows on its own whenever a card's height changes
        // (e.g. expanding a reply thread) — no JS measuring/repositioning
        // needed, unlike a hand-rolled masonry. The one real tradeoff: this
        // fills top-to-bottom in column 1 before starting column 2
        // (newspaper order), not left-to-right row by row, so "Top"/
        // "Recent" reads column-major rather than one strict ranked
        // sequence — acceptable for a discussion feed, not a leaderboard.
        // `gap` only spaces the columns apart, not items stacked within one
        // column, so each card's own wrapper carries the vertical margin
        // instead; break-inside-avoid keeps a card from splitting across
        // the column break.
        <div className="columns-1 gap-5 lg:columns-2">
          {items.map((item) => (
            <div key={item.note.id} className="mb-5 break-inside-avoid">
              <CommunityNoteCard item={item} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
