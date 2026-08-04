"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import AudioPlayer from "./AudioPlayer";
import { useAudioStore } from "@/stores/audio-store";
import { useNarrationStore } from "@/stores/narration-store";
import { useReaderStore } from "@/stores/reader-store";
import { useReaderOverlayStore } from "@/stores/reader-overlay-store";

/**
 * The one persistent "now playing" bar — mounted once in the root layout
 * (alongside NarrationEngine, which actually drives playback) so it stays
 * fixed to the bottom of the viewport across every route, library
 * included. Renders nothing while no book is loaded for listening; the
 * reader's own X is the only thing that clears it (see audio-store's
 * closePlayer) — navigating away, including to the library, never does.
 */
export default function NowPlayingBar() {
  // --reader-surface/--reader-border/etc. (globals.css) are scoped to
  // [data-reader-theme] rather than :root, since only the reader itself
  // (not the rest of the app) is meant to follow the light/dark toggle.
  // This bar renders in the root layout though, outside Reader's own
  // theme-scoped div — without setting the attribute again here, those
  // variables would all resolve to nothing and the player would render
  // with no background/border/text color at all.
  const theme = useReaderStore((s) => s.theme);
  const book = useAudioStore((s) => s.book);
  const closePlayer = useAudioStore((s) => s.closePlayer);
  const setPlayerHeight = useAudioStore((s) => s.setPlayerHeight);
  const audioSection = useNarrationStore((s) => s.audioSection);
  const audioSectionTrack = useNarrationStore((s) => s.audioSectionTrack);
  const narratorOptions = useNarrationStore((s) => s.narratorOptions);
  const canSkipToPrevSection = useNarrationStore((s) => s.canSkipToPrevSection);
  const canSkipToNextSection = useNarrationStore((s) => s.canSkipToNextSection);
  const skipToPrevSection = useNarrationStore((s) => s.skipToPrevSection);
  const skipToNextSection = useNarrationStore((s) => s.skipToNextSection);
  const handleSeek = useNarrationStore((s) => s.handleSeek);
  const router = useRouter();
  // Every route except the reader itself now has a persistent left sidebar
  // (app/components/shell/AppSidebar.tsx) at the same 860px breakpoint —
  // full-width here would run this bar underneath it, covering the
  // sidebar's own bottom-pinned theme/logout controls.
  //
  // pathname alone can't tell "the standalone /read page" (no sidebar)
  // apart from "ReaderModal open over a sidebar-having page" (sidebar's
  // still there) — an intercepted (.)read/[slug] navigation moves the URL
  // to /read/[slug] either way. overlayOpen (reader-overlay-store) is what
  // ReaderModal itself sets, so it's the actual source of truth here; a
  // pathname starting with "/read" only means "no sidebar" when that flag
  // says the overlay isn't the reason. Without this override, this bar ran
  // full-width underneath the modal and sat on top of the sidebar's own
  // nav items (z-50 vs. the sidebar's z-30) whenever a book was loaded for
  // listening while the reader overlay was open — silently eating clicks
  // on whatever nav item it happened to cover.
  const pathname = usePathname();
  const overlayOpen = useReaderOverlayStore((s) => s.open);
  const hasSidebar = !pathname.startsWith("/read") || overlayOpen;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !book) {
      setPlayerHeight(0);
      return;
    }
    const ro = new ResizeObserver((entries) => setPlayerHeight(entries[0].contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [book, setPlayerHeight]);

  if (!book) return null;

  return (
    <div
      ref={containerRef}
      data-reader-theme={theme}
      className={`fixed bottom-0 left-0 right-0 z-50 ${
        hasSidebar ? "shell:left-[var(--app-sidebar-w)]" : ""
      }`}
    >
      <AudioPlayer
        variant="full"
        bookTitle={book.metadata.title}
        chapterLabel={audioSection?.title ?? book.metadata.title}
        coverSrc={book.metadata.cover}
        narrators={narratorOptions}
        durationMs={audioSectionTrack?.durationMs ?? 0}
        onSeek={handleSeek}
        onSkipPrev={skipToPrevSection}
        onSkipNext={skipToNextSection}
        canSkipPrev={canSkipToPrevSection}
        canSkipNext={canSkipToNextSection}
        onTitleClick={() => router.push(`/read/${book.slug}`)}
        onClose={closePlayer}
      />
    </div>
  );
}
