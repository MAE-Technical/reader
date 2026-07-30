"use client";

import type { ReactNode } from "react";
import TimeAgo from "react-timeago-i18n";
import type { NoteContent } from "@/stores/library-store";
import VoiceNoteView from "./VoiceNoteView";

export type NoteCardAuthor = { name: string; avatarUrl?: string };

/**
 * One note's content (text or voice) + its metadata — the single rendering
 * used everywhere a saved note appears: the reader's own note panel
 * (NotesSidebar, one card per thread entry), a book's aggregate notes tab
 * (one card per note, across every chapter), and eventually a "community"
 * note on the home feed once multi-reader notes exist. Only the content and
 * timestamp are ever bundled — citation/quote, author, and trailing actions
 * are each optional so a given context only pays for what it needs.
 */
export default function NoteCard({
  content,
  savedAt,
  citation,
  quote,
  author,
  actions,
}: {
  content: NoteContent;
  savedAt: number;
  /** Chapter/section label ("Ch. 3 · The Fact of Blackness") — a thread
   * panel (NotesSidebar) shows this once above the whole list instead,
   * since every entry there already shares one citation. */
  citation?: string;
  /** The passage text this note is attached to — same reasoning as
   * `citation`: omitted wherever the quote already renders once above the
   * list rather than per entry. */
  quote?: string;
  /** Only meaningful once real multi-reader notes exist — absent for
   * today's local, single-device notes. */
  author?: NoteCardAuthor;
  /** Trailing controls (the reader's own edit/delete ellipsis menu) — a
   * slot rather than baked in, since a read-only aggregate view doesn't
   * necessarily want them. */
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {(author || citation) &&
        (author ? (
          <div className="flex items-center gap-2">
            {author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={author.avatarUrl} alt={author.name} className="h-6 w-6 flex-none rounded-full object-cover" />
            ) : (
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[var(--reader-surface-hover)] text-[10px] font-semibold text-[var(--reader-text-muted)]">
                {author.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="text-xs font-semibold text-[var(--reader-text)]">{author.name}</span>
          </div>
        ) : (
          <span className="text-xs font-medium text-[var(--reader-text-subtle)]">{citation}</span>
        ))}

      {quote && (
        <p className="m-0 truncate font-serif text-[13.5px] italic leading-[1.5] text-[var(--reader-text-muted)]">
          &ldquo;{quote}&rdquo;
        </p>
      )}

      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {content.kind === "text" ? (
            <p className="m-0 text-sm text-[var(--reader-text)]">{content.text}</p>
          ) : (
            <VoiceNoteView audioUrl={content.audioUrl} durationMs={content.durationMs} />
          )}
        </div>
        {actions}
      </div>

      <div className="flex items-center gap-1.5 text-[10.5px] font-medium text-[var(--reader-text-muted)]">
        <TimeAgo date={new Date(savedAt)} />
      </div>
    </div>
  );
}
