"use client";

import { useState } from "react";
import { HandFist } from "lucide-react";
import { useIsAuthenticated } from "@/lib/auth/useIsAuthenticated";
import MembersOnlyPrompt from "./MembersOnlyPrompt";

/** The single warm reaction (not an up/down pair — a moderation-less
 * comradely space stays purely additive, per the design brief). A single
 * bordered pill with the icon and count inside it, not a separate
 * icon-chip-plus-outside-text — mirrors the design mock's reaction/reply
 * button shape. Reused at both the top-level-note and reply scale via
 * `size`.
 *
 * Reachable by anyone regardless of auth (unlike Reply/Edit/Delete, nothing
 * upstream already gates this) — so it gates itself: a signed-out tap shows
 * MembersOnlyPrompt in a small popover instead of calling `onToggle`, using
 * the same "fixed inset-0 scrim + absolute box" idiom OverflowMenu.tsx
 * already uses for its own dropdown, rather than redirecting
 * (lib/reader/useRequireAuth.ts, since removed). */
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
  const isAuthenticated = useIsAuthenticated();
  const [showPrompt, setShowPrompt] = useState(false);
  const isSmall = size === "small";

  const handleClick = () => {
    if (!isAuthenticated) {
      setShowPrompt((v) => !v);
      return;
    }
    onToggle();
  };

  return (
    <div className="relative inline-flex">
      <button
        onClick={handleClick}
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
      {showPrompt && (
        <>
          <div onClick={() => setShowPrompt(false)} className="fixed inset-0 z-19" />
          <div className="absolute left-0 top-[calc(100%+4px)] z-20 w-56">
            <MembersOnlyPrompt action="react" onClose={() => setShowPrompt(false)} />
          </div>
        </>
      )}
    </div>
  );
}
