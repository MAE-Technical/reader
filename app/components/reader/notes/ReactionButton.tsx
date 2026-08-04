"use client";

import { HandFist } from "lucide-react";

/** The single warm reaction (not an up/down pair — a moderation-less
 * comradely space stays purely additive, per the design brief). A single
 * bordered pill with the icon and count inside it, not a separate
 * icon-chip-plus-outside-text — mirrors the design mock's reaction/reply
 * button shape. Reused at both the top-level-note and reply scale via
 * `size`. */
export default function ReactionButton({
  count,
  reacted,
  onToggle,
  size = "default",
}: {
  count: number;
  reacted: boolean;
  onToggle: () => void;
  size?: "default" | "small";
}) {
  const isSmall = size === "small";
  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold cursor-pointer transition-colors ${
        isSmall ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
      } ${
        reacted
          ? "border-brand-500 bg-brand-500/10 text-brand-500"
          : "border-[var(--reader-border)] bg-[var(--reader-surface)] text-[var(--reader-text-muted)] hover:border-brand-500 hover:bg-brand-500/5 hover:text-brand-500"
      }`}
    >
      <HandFist size={isSmall ? 11 : 13} />
      {count}
    </button>
  );
}
