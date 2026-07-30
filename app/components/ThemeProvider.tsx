"use client";

import { useEffect } from "react";
import { useReaderStore } from "@/stores/reader-store";

// Mounted once at the root layout (alongside NarrationEngine/NowPlayingBar)
// so the reader's light/dark preference — previously scoped to Reader.tsx's
// own subtree — applies everywhere the --reader-* tokens are used, e.g. the
// shared Loader shown on every route's loading.tsx, not just inside the
// reader itself. `display: contents` keeps this wrapper out of the layout
// box tree entirely; only the data-reader-theme attribute (and the CSS
// custom properties it scopes) is what actually does anything here.
export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useReaderStore((s) => s.theme);

  useEffect(() => {
    useReaderStore.persist.rehydrate();
  }, []);

  // Custom properties only cascade to descendants, and <html>/<body> are
  // ANCESTORS of this div — so html/body's own background (globals.css)
  // could never see --reader-bg through the div's attribute alone. Setting
  // it on the root element too closes that gap: anywhere the shell's own
  // background doesn't fully cover the viewport (overscroll bounce, a
  // short/uncovered page) now shows the right theme's canvas instead of
  // always falling back to the fixed light cream.
  useEffect(() => {
    document.documentElement.setAttribute("data-reader-theme", theme);
  }, [theme]);

  return (
    <div data-reader-theme={theme} className="contents">
      {children}
    </div>
  );
}
