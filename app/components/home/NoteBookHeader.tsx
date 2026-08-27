"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { rangesKey } from "@/stores/library-store";
import type { CommunityFeedItem } from "@/lib/community/useCommunityFeed";
import BookCover from "@/app/components/shared/BookCover";
import { resolveBookThumbnailSrc } from "@/lib/materials/image";

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
  const passageId = item.note.ranges[0]?.passageId;
  // Reader.tsx's own annotation ids are deterministic, derived from an
  // annotation's exact ranges (see rangesKey) — recomputing it here from
  // the same note's own ranges is what makes `?note=` actually match the
  // Annotation the reader lands on once inside the book (Reader.tsx's
  // useTextAnnotations/useAnnotations builds that same key from the same
  // ranges), rather than the note's own (unrelated) row id.
  const href = `/read/${item.material.slug}?${new URLSearchParams({
    section: item.sectionId,
    ...(passageId ? { passage: passageId } : {}),
    note: rangesKey(item.note.ranges),
  }).toString()}`;

  return (
    <Link
      href={href}
      aria-label={`Open in ${item.material.title}`}
      className="group flex cursor-pointer items-center gap-2.5 no-underline"
    >
      <BookCover
        src={resolveBookThumbnailSrc(item.material)}
        alt={item.material.title}
        className="h-12 w-10 flex-none rounded-sm border border-[var(--reader-border)]"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-serif leading-[1.6] font-semibold text-[var(--reader-text)]">
          {item.material.title}
        </div>
        <div className="truncate text-[11.5px] font-medium text-[var(--reader-text-muted)]">
          {item.material.author}
          {item.label && ` · ${item.label}`}
        </div>
      </div>
      <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-[var(--reader-border)] text-[var(--reader-text-muted)] group-hover:bg-[var(--reader-surface-hover)] group-hover:text-[var(--reader-text)]">
        <ArrowUpRight size={15} />
      </span>
    </Link>
  );
}
