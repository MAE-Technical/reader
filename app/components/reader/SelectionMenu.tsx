"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Copy, Highlighter, PenLine, Play, Trash2 } from "lucide-react";
import type { Theme } from "@/stores/reader-store";
import type { SelectionAnchor } from "@/lib/reader/useTextAnnotations";

type Props = {
  /** The selection's own bounding rect (viewport coordinates) — the pill
   * measures itself against this rather than being handed a precomputed
   * top/left, so it can clamp/flip to stay fully on screen regardless of
   * where in the viewport the selection landed. */
  anchor: SelectionAnchor;
  /** Drives the pill's invert-against-the-page treatment below — not read
   * from the reader's own CSS theme vars, since this deliberately goes the
   * *opposite* direction of the page it floats over. */
  theme: Theme;
  copyLabel: string;
  /** Omitted entirely when the book has no narrator — no Play option is
   * shown, rather than one that would fall back to a live-TTS voice. */
  onPlay?: () => void;
  onHighlight: () => void;
  onNote: () => void;
  onCopy: () => void;
  /** Only present when this selection exactly matches an existing
   * highlight/note — removes the whole thing (highlight wash + every note
   * in its thread) in one action, discoverable via the pill itself rather
   * than relying on re-selecting the same range and hitting Highlight. */
  onDelete?: () => void;
  onDismiss: () => void;
};

type Item = { key: string; icon: ReactNode; label: string; onClick: () => void; danger?: boolean };

// A consistent, theme-independent danger red — the inverted pill already
// guarantees contrast against the page behind it, so this just needs to
// read as "destructive" against the pill's own near-black/near-white fill.
const DANGER_COLOR = "#f26b6b";

const VIEWPORT_MARGIN = 8;

/**
 * Selection menu (Play/Highlight/Note/Copy) shown on text selection. A
 * fixed-position overlay rendered outside BookContent's scrollable tree, so
 * selecting text never forces the (memoized) book content to re-render.
 * No Share — sharing is out of scope for now (per product decision).
 *
 * Inverts against the reading page (note-redesign.md): a light page gets a
 * near-black pill, a dark page gets a near-white one — the same idiom as a
 * native OS tooltip landing on arbitrary content, and it guarantees contrast
 * regardless of what's behind it without needing per-theme tuning.
 *
 * Position is measure-then-place, not a single upfront calculation: the
 * pill's own width varies with how many actions are showing (Play/Delete
 * are conditional), so it renders once invisibly, measures itself via
 * `rootRef`, and only then computes a clamped top/left — shifted inward
 * horizontally and flipped above/below the selection vertically as needed
 * so it's always fully on screen, never obscured off an edge.
 */
export default function SelectionMenu({
  anchor,
  theme,
  copyLabel,
  onPlay,
  onHighlight,
  onNote,
  onCopy,
  onDelete,
  onDismiss,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; flipped: boolean } | null>(null);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();

    let left = anchor.left;
    left = Math.min(left, window.innerWidth - width - VIEWPORT_MARGIN);
    left = Math.max(left, VIEWPORT_MARGIN);

    // Prefer floating above the selection (matches the old fixed -48px
    // offset); flip below it instead when there isn't room above — e.g. a
    // selection starting right at the top of the viewport. The little
    // pointer triangle (below) tracks which side won so it stays attached
    // to the edge nearest the selection either way.
    let top = anchor.top - height - 12;
    const flipped = top < VIEWPORT_MARGIN;
    if (flipped) top = anchor.bottom + 12;
    top = Math.min(top, window.innerHeight - height - VIEWPORT_MARGIN);
    top = Math.max(top, VIEWPORT_MARGIN);

    setPos({ top, left, flipped });
  }, [anchor]);

  // Tapping anywhere that isn't the pill itself and isn't inside a reading
  // section dismisses it — content-area taps already end the selection via
  // onTextSelect's own touchend/mouseup handler (see useTextAnnotations.ts),
  // so this only needs to cover chrome outside that (header, rail, etc.).
  // A listener, not an overlay element, so it never sits in the hit-test
  // path and can't block scrolling the way the old full-screen catcher did.
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if ((target as HTMLElement).closest?.("[data-section-id]")) return;
      onDismiss();
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [onDismiss]);

  const inverted = theme === "light";
  const bg = inverted ? "#0a0a0a" : "#fdfbf8";
  const fg = inverted ? "#fdfbf8" : "#0a0a0a";
  const divider = inverted ? "rgba(255,255,255,.15)" : "rgba(0,0,0,.12)";
  const shadow = inverted ? "var(--shadow-md)" : "var(--shadow-lg)";

  const items: Item[] = [
    ...(onPlay
      ? [{ key: "play", icon: <Play size={14} fill="currentColor" stroke="none" />, label: "Play", onClick: onPlay }]
      : []),
    { key: "highlight", icon: <Highlighter size={14} />, label: "Highlight", onClick: onHighlight },
    { key: "note", icon: <PenLine size={14} />, label: "Note", onClick: onNote },
    { key: "copy", icon: <Copy size={14} />, label: copyLabel, onClick: onCopy },
    ...(onDelete
      ? [{ key: "delete", icon: <Trash2 size={14} />, label: "Delete", onClick: onDelete, danger: true }]
      : []),
  ];

  return (
    <div
      ref={rootRef}
      style={{
        top: pos?.top ?? anchor.top,
        left: pos?.left ?? anchor.left,
        background: bg,
        boxShadow: shadow,
        // Invisible until the first measure/clamp pass has run — otherwise
        // there'd be a one-frame flash at the raw (unclamped) anchor
        // position before it jumps to its real, on-screen spot.
        visibility: pos ? "visible" : "hidden",
      }}
      className="reader-menu-in fixed flex items-center gap-px rounded-md p-1 z-30 select-none no-callout"
    >
      <div
        style={{ background: bg }}
        className={`absolute left-5 w-2 h-2 rotate-45 rounded-xs ${pos?.flipped ? "-top-1" : "-bottom-1"}`}
      />
      {items.map((item, i) => (
        <div key={item.key} className="flex items-center">
          {i > 0 && <div style={{ background: divider }} className="w-px h-4 mx-0.5 flex-none" />}
          <button
            onClick={item.onClick}
            style={{ color: item.danger ? DANGER_COLOR : fg }}
            className="flex items-center gap-1.5 bg-transparent border-none py-1.75 px-3 rounded-full cursor-pointer text-xs font-semibold whitespace-nowrap"
          >
            {item.icon}
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}
