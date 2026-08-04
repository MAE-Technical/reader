"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, X } from "lucide-react";
import Tooltip from "../Tooltip";

export default function PanelShell({
  panelType,
  title,
  onBack,
  headerMenu,
  subheader,
  onClose,
  children,
}: {
  panelType?: "side" | "sheet";
  /** A plain string for a simple title (the note panel), or any composed
   * block (e.g. a title + subtitle stack) for a panel that needs more —
   * ReactNode rather than a dedicated `subtitle` prop, so this stays the
   * one flexible slot instead of PanelShell growing a new prop per caller. */
  title: ReactNode;
  /** Present only while drilled into a note's own reply thread — steps back
   * out to whichever thread was open before, one level at a time. */
  onBack?: () => void;
  /** Trailing header control before Close — the panel's own overflow menu
   * (e.g. Share passage / Delete highlight), rendered as a slot rather than
   * a fixed action since what belongs in it is entirely up to the caller. */
  headerMenu?: ReactNode;
  /** A pinned row below the header, above the scrollable body — e.g. the
   * book feed's browse bar (prev/next + jump). Stays visible while the
   * body beneath it scrolls, unlike anything passed as `children`. */
  subheader?: ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const isSheet = panelType ? panelType === "sheet" : isMobile;

  return (
    // pointer-events-none — this box exists only to flex-align the real
    // panel below within Reader.tsx's already-narrow wrapper column; on
    // mobile in particular it's taller than the sheet itself (items-end
    // leaves the empty space above it), and none of that empty space
    // should ever intercept a scroll/tap meant for the book content behind
    // it. pointer-events-auto on the actual panel box below restores it.
    <div
      className={`w-full h-full min-h-dvh box-border relative flex overflow-hidden pointer-events-none ${
        isSheet ? "justify-center items-end" : "justify-end items-stretch"
      }`}
    >
      <div
        className={`max-w-full bg-[var(--reader-surface)] shadow-lg flex flex-col box-border overflow-hidden flex-none pointer-events-auto ${
          isSheet
            ? "w-full h-[82%] max-h-[82%] rounded-t-lg"
            : "w-95 h-full max-h-full border border-[var(--reader-border)]"
        }`}
      >
        {isSheet && (
          <div className="flex justify-center pt-2.5 pb-1 flex-none">
            <div className="w-9 h-1 rounded-full bg-[var(--reader-border)]" />
          </div>
        )}
        <div className="px-5 py-4 flex-none flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {onBack && (
              <Tooltip label="Back" side="bottom">
                <button
                  onClick={onBack}
                  className="flex-none bg-transparent border-none cursor-pointer text-[var(--reader-text-muted)] -ml-1 p-1"
                >
                  <ArrowLeft size={16} />
                </button>
              </Tooltip>
            )}
            <span className="truncate font-serif font-semibold text-base text-[var(--reader-text)]">{title}</span>
          </div>
          <div className="flex items-center gap-3.5 flex-none">
            {headerMenu}
            <Tooltip label="Close" side="bottom" align="end">
              <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-[var(--reader-text-muted)]">
                <X size={16} />
              </button>
            </Tooltip>
          </div>
        </div>
        {subheader && (
          <div className="flex-none border-b border-[var(--reader-border)] bg-[var(--reader-surface)]">
            {subheader}
          </div>
        )}
        <div className="om-scroll flex-1 min-h-0 overflow-y-auto overscroll-y-contain px-5 pb-10 flex flex-col gap-3.5">
          {children}
        </div>
      </div>
    </div>
  );
}
