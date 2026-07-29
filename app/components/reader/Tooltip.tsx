"use client";

import type { ReactNode } from "react";

type Align = "center" | "start" | "end";

type Props = {
  label: string;
  children: ReactNode;
  /** Which side of the trigger the tooltip floats on — "bottom" for chrome
   * pinned to the top of the screen (the header), "top" for chrome pinned
   * to the bottom (the audio player), so the tooltip never opens off-screen. */
  side?: "top" | "bottom";
  /** Horizontal anchor for the *bubble* relative to the trigger. "center"
   * (default) is fine for anything with room on both sides; triggers
   * pinned near the left/right edge of a bar (the back button, the last
   * icon in a cluster) need "start"/"end" instead — a centered bubble on an
   * edge trigger overflows past the viewport and gets clipped. The tail
   * always points at the trigger's true center regardless of this — see
   * below. */
  align?: Align;
};

const BUBBLE_ALIGN: Record<Align, string> = {
  center: "left-1/2 -translate-x-1/2",
  start: "left-0",
  end: "right-0",
};

// The wrapper span below is inline-flex around exactly one child, so its
// box IS the trigger's own bounding box. The bubble can shift to "start"/
// "end" to stay on-screen, but the tail is a sibling of the bubble — not
// nested inside it — positioned independently at the wrapper's horizontal
// center. That's what keeps the tail consistently pointing at the trigger
// itself (simple arithmetic: 50% of the trigger's own width) instead of
// wherever the bubble happened to end up, which is what made it look
// arbitrary once the bubble started shifting for edge triggers.
const VERTICAL_ANCHOR: Record<"top" | "bottom", string> = {
  top: "bottom-[calc(100%+10px)]",
  bottom: "top-[calc(100%+10px)]",
};

/**
 * Shared themed tooltip for reader icon buttons — no external library, just
 * plain CSS. Inverts against the current reader theme using the same
 * `--reader-text`/`--reader-bg` pair every other themed surface reads,
 * which happens to already BE each other's inverse (light: text #000/bg
 * #fff, dark: text #fff/bg #000), so no separate tooltip-specific tokens
 * are needed.
 *
 * Pure CSS `group-hover` (no JS state, no mount/unmount) — this also means
 * it only ever appears on devices that can actually hover, which is the
 * desktop-only behavior the design calls for without needing a touch-
 * detection branch.
 */
export default function Tooltip({ label, children, side = "top", align = "center" }: Props) {
  return (
    <span className="group relative inline-flex">
      {children}

      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 scale-95 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold opacity-0 shadow-lg transition-[opacity,transform] duration-150 group-hover:scale-100 group-hover:opacity-100 ${BUBBLE_ALIGN[align]} ${VERTICAL_ANCHOR[side]}`}
        style={{ background: "var(--reader-text)", color: "var(--reader-bg)" }}
      >
        {label}
      </span>

      {/* Always centered on the trigger — see the note on VERTICAL_ANCHOR
          above for why this has to be a sibling, not nested in the bubble. */}
      <span
        className={`pointer-events-none absolute left-1/2 h-0 w-0 -translate-x-1/2 border-x-4 border-x-transparent opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${VERTICAL_ANCHOR[side]} ${
          side === "top" ? "border-t-4 border-t-[var(--reader-text)]" : "border-b-4 border-b-[var(--reader-text)]"
        }`}
      />
    </span>
  );
}
