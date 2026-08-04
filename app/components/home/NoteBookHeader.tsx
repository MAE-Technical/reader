"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CommunityFeedItem } from "@/lib/home/communityFeed";

/** A community note's book context — cover, title, author, and (when
 * known) the section the highlight is drawn from, plus a deep link into
 * the book at that exact passage. Just the header; the excerpt itself is
 * `NoteThreadCard`'s own `quote` prop, rendered below this in its own
 * theme-reactive QuoteCard rather than bundled in here — that's what lets
 * the same header/quote split reuse cleanly wherever a note appears.
 *
 * The whole row is the link, not just the ArrowUpRight glyph — that icon
 * used to be the only clickable bit, which made the cover/title/author
 * beside it look interactive (cursor never changed, nothing happened) even
 * though they weren't wired up. `group` on this root plus `group-hover:` on
 * the glyph's own circle is what lets a hover anywhere in the row still
 * light up that one visual affordance, instead of every child needing its
 * own hover state. */
export default function NoteBookHeader({ item }: { item: CommunityFeedItem }) {
  const href = `/read/${item.book.slug}?${new URLSearchParams({
    section: item.sectionId,
    passage: item.passageId,
    note: item.annotationId,
  }).toString()}`;

  return (
    <Link
      href={href}
      aria-label={`Open in ${item.book.title}`}
      className="group flex cursor-pointer items-center gap-2.5 no-underline"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.book.cover}
        alt={item.book.title}
        className="h-12 w-10 flex-none rounded-sm border border-[var(--reader-border)] object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-serif leading-[1.6] font-semibold text-[var(--reader-text)]">
          {item.book.title}
        </div>
        <div className="truncate text-[11.5px] font-medium text-[var(--reader-text-muted)]">
          {item.book.author}
          {item.label && ` · ${item.label}`}
        </div>
      </div>
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-[var(--reader-border)] text-[var(--reader-text-muted)] group-hover:bg-[var(--reader-surface-hover)] group-hover:text-[var(--reader-text)]">
        <ArrowUpRight size={15} />
      </span>
    </Link>
  );
}
