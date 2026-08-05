"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Reader from "./Reader";
import type { BookDocument } from "@/lib/book/schema";
import { useReaderOverlayStore } from "@/stores/reader-overlay-store";

// Matches .reader-modal-panel-exit/.reader-modal-scrim-exit's own duration
// (globals.css) — router.back() is deliberately delayed by this long so the
// close animation gets to actually play before the route (and this
// component) disappears, rather than the modal just vanishing instantly the
// way the very first version of this did.
const EXIT_ANIMATION_MS = 220;

/** The intercepted-route shell around Reader (app/@modal/(.)read/[slug]) —
 * an overlay on top of whatever page triggered it (the home community feed
 * today; any future "preview this book" entry point later), rather than a
 * full page navigation away from it. `router.back()` is the close action
 * rather than a hardcoded route: it pops the client-side history entry this
 * modal was pushed onto, which is also exactly what the real browser back
 * button already does, so there's only one "close" path to keep in sync,
 * not two.
 *
 * The panel/scrim enter+exit animation (globals.css) is what makes this
 * *read* as an overlay in motion — an instant appear/disappear looked and
 * felt indistinguishable from a real navigation, even though under the hood
 * it wasn't one. `closing` gates which pair of keyframes is active; the
 * real route pop is deliberately delayed by EXIT_ANIMATION_MS so the
 * animation gets to finish first (a real browser back-button press bypasses
 * this entirely and unmounts instantly — not fixable without intercepting
 * popstate, and out of scope here).
 *
 * But motion alone wasn't enough — once settled, a full-bleed panel is
 * pixel-identical to a real page, so the "this is a layer on top of
 * something" read has to survive after the animation ends too, not just
 * during it. `shell:left-[var(--app-sidebar-w)]` is what does that at
 * rest: the same 220px strip AppShell already reserves for the persistent
 * desktop nav rail (AppSidebar.tsx) stays uncovered, so the app underneath
 * keeps visibly existing the whole time the modal is open — exactly the cue
 * the Substack reference this was modeled on relies on. Below that
 * breakpoint the panel stays full-bleed on purpose rather than leaving the
 * same strip for AppBottomNav (still mounted underneath, just covered) —
 * there's no spare width to spend on a mobile screen the way there is next
 * to the desktop rail, and reading real estate wins.
 *
 * z-40 — above ordinary page content, but still below NowPlayingBar's own
 * z-50 (app/components/NowPlayingBar.tsx), so a playing book's persistent
 * bar keeps floating on top of this the same way it already does over the
 * standalone /read/[slug] page. */
export default function ReaderModal({
  book,
  materialId,
  targetSectionId,
  targetPassageId,
  targetNoteId,
}: {
  book: BookDocument;
  materialId: string;
  targetSectionId?: string;
  targetPassageId?: string;
  targetNoteId?: string;
}) {
  const router = useRouter();
  const [closing, setClosing] = useState(false);

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => router.back(), EXIT_ANIMATION_MS);
  }, [router]);

  // Escape closes the modal — standard takeover-modal convention, and
  // nothing else in this reader claims the key today (the standalone route
  // has no such shortcut, so there's nothing to conflict with).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close]);

  // A plain <Link> elsewhere on the underlying page (AppSidebar's nav, say)
  // navigating to some unrelated route — /library, another book — should
  // just show that route immediately, the modal closing as an implicit
  // side effect of leaving. In practice the @modal slot didn't reliably
  // swap back to its own default.tsx (a null render) the instant that kind
  // of navigation happened: the new page loaded in behind this one, which
  // kept right on rendering on top of it until something explicitly closed
  // it — router.back() being the only path that ever did. isCurrentRoute is
  // this component's own belt-and-suspenders check on top of whatever
  // Next's parallel-route reconciliation was supposed to handle: as soon as
  // the live pathname stops being *this* book's own /read/[slug], there's
  // no longer any reading for this instance to be showing, full stop.
  const pathname = usePathname();
  const isCurrentRoute = pathname === `/read/${book.slug}`;

  // Locks the triggering page's own scroll behind the modal — without this,
  // a wheel/touch gesture landing outside Reader's own (independently
  // scrolling) content would scroll the home page underneath along with it.
  // Scoped to isCurrentRoute so a navigation away releases the lock (and
  // the overlay-open flag below) the same render pass that stops showing
  // the modal, rather than only on this component's eventual unmount.
  useEffect(() => {
    if (!isCurrentRoute) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isCurrentRoute]);

  // See reader-overlay-store's own doc comment — this is the one place
  // that knows for certain "the reader is open as an overlay right now,"
  // so it's the one place responsible for saying so.
  const setOverlayOpen = useReaderOverlayStore((s) => s.setOpen);
  useEffect(() => {
    if (!isCurrentRoute) return;
    setOverlayOpen(true);
    return () => setOverlayOpen(false);
  }, [isCurrentRoute, setOverlayOpen]);

  if (!isCurrentRoute) return null;

  return (
    // Two layers, not one: this outer div is purely the scrim (its own
    // background-color is what the reader-modal-scrim-* keyframes animate),
    // while the inner div carries the slide/scale/fade
    // (reader-modal-panel-*). Splitting them is what lets the scrim show
    // through in the gap the panel's own translateY/scale briefly leaves
    // around it while animating — a plain single-div version couldn't fade
    // a background in behind its own transform.
    <div
      className={`fixed inset-0 shell:left-[var(--app-sidebar-w)] z-40 ${closing ? "reader-modal-scrim-exit" : "reader-modal-scrim-enter"}`}
    >
      <div className={`h-full w-full ${closing ? "reader-modal-panel-exit" : "reader-modal-panel-enter"}`}>
        <Reader
          book={book}
          materialId={materialId}
          targetSectionId={targetSectionId}
          targetPassageId={targetPassageId}
          targetNoteId={targetNoteId}
          onClose={close}
        />
      </div>
    </div>
  );
}
