"use client";

import type { NoteContent as NoteContentValue } from "@/stores/library-store";
import VoiceNoteView from "./VoiceNoteView";

/** One note/reply's actual content — text or voice — with no author,
 * timestamp, or actions bundled in (see AuthorRow for those); split out so
 * the same rendering works at both the top-level-note and reply scale. */
export default function NoteContent({
  content,
}: {
  content: NoteContentValue;
}) {
  if (content.kind === "voice") {
    return <VoiceNoteView audioUrl={content.audioUrl} durationMs={content.durationMs} />;
  }
  return (
    <p
      className={`m-0 whitespace-pre-wrap font-serif text-sm leading-[1.6] text-[var(--reader-text)]`}
    >
      {content.text}
    </p>
  );
}
