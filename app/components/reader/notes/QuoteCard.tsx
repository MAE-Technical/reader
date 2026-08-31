"use client";

// A self-contained pull-quote card — modeled on Substack's restack card: an
// isolated "someone pulled this exact passage out of the page" object, not
// just styled body text. Theme-reactive (a lighter sunken surface in light
// mode, a darker one in dark mode) rather than fixed-dark in both themes —
// a feed built from many stacked cards must not read as oppressively dark
// just because the object it embeds is metaphorically "a dark card"; it
// should sit on the page the way the reader's own theme already does.
// Shared shell for both the book-passage quote (top of a fresh thread) and
// a drilled-in note's own quote (top of its reply thread) — same object,
// different source of "the thing being replied to." See Quote and NoteQuote.
// One fixed treatment everywhere it appears — no "compact" variant, since
// every caller ended up wanting the same size anyway.
export default function QuoteCard({
  children,
  icon = true,
  onClick,
}: {
  children: React.ReactNode;
  /** The standalone quote-mark glyph above `children` — on by default
   * (every existing caller wants it), but a caller building its own
   * internal layout (e.g. a quote mark placed inline next to the passage
   * text itself, rather than floating alone at the top) can turn it off
   * instead of this shell forcing one look on every consumer. */
  icon?: boolean;
  /** Makes the whole card the click target (e.g. "show in passage") rather
   * than a separate icon competing for space in a footer — a card with
   * somewhere to go should just go there when tapped, the way the rest of
   * this reader's cards already work. Adds the pointer cursor and minimal
   * keyboard/role support itself, so callers don't each reimplement it. */
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              onClick();
            }
          : undefined
      }
      className={`rounded-sm bg-[var(--reader-quote-bg)] border border-[var(--reader-border)] flex flex-col px-4 py-4 gap-1 ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      {icon && (
        <span aria-hidden="true" className="select-none font-literata text-[32px] leading-[0.5] text-[var(--reader-quote-subtle)]">
          &ldquo;
        </span>
      )}
      {children}
    </div>
  );
}
