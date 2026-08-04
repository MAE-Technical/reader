"use client";

import { MessageCircle } from "lucide-react";

/** The reply count + thread-toggle, labelled "note(s)" rather than
 * "reply/replies" — every reply is itself just another note in the thread,
 * so the whole product only ever talks about "notes," never "replies."
 * Same bordered-pill shape as
 * ReactionButton (icon + text inside one control), but deliberately
 * neutral: no brand color, no filled icon background when expanded, even
 * on click — reply is a plain disclosure control, not a "reacted" state,
 * so it only ever shifts to a neutral surface tint. Always shows its
 * count, including zero, same "always shown" convention as the reaction
 * pill. Its one job is opening/closing the note's own reply thread
 * (existing replies + a composer to add one) — there's no separate
 * "Reply" trigger anymore. */
export default function ReplyButton({
  count,
  expanded,
  onToggle,
}: {
  count: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold cursor-pointer transition-colors ${
        expanded
          ? "border-[var(--reader-border)] bg-[var(--reader-surface-hover)] text-[var(--reader-text)]"
          : "border-[var(--reader-border)] bg-[var(--reader-surface)] text-[var(--reader-text-muted)] hover:bg-[var(--reader-surface-hover)] hover:text-[var(--reader-text)]"
      }`}
    >
      <MessageCircle size={13} />
      {count} {count === 1 ? "note" : "notes"}
    </button>
  );
}
