"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import type { BookDocument } from "@/lib/book/schema";
import { buildOutlineRows } from "@/lib/reader/outline";
import Tooltip from "./Tooltip";

type Props = {
  book: BookDocument;
  scrollPct: number;
  activeSectionId: string;
  isMobile: boolean;
  open: boolean;
  // No header-height offset anymore — the drawer is always full height.
  // Reader.tsx hides the floating header for as long as the outline is
  // open instead, so there's nothing above the drawer to reserve space
  // for in the first place (the previous fixed marginTop-for-the-header
  // approach left a dead gap whenever scroll had hidden the header out
  // from under that reservation).
  onNavigate: (sectionId: string) => void;
  onClose: () => void;
};

export default function ChaptersDrawer({
  book,
  scrollPct,
  activeSectionId,
  isMobile,
  open,
  onNavigate,
  onClose,
}: Props) {
  const sidebarRows = useMemo(() => buildOutlineRows(book.sections), [book.sections]);

  // Mobile vs desktop layout is decided in pure CSS (the min-[860px]:
  // breakpoint below, matching useSectionCarousel's isMobile threshold) —
  // deliberately NOT branched on the isMobile prop the way it briefly was.
  // isMobile starts false on every render (SSR-safe) and only flips to its
  // real value in an effect after mount, so an isMobile-gated className
  // swap here caused a one-frame jump from "no transform" straight into
  // "fixed inset-0 + mid-transition transform" — the drawer flashed full
  // screen and slid itself away, reading as "open by default" on load. A
  // media-query breakpoint is correct from the very first paint, no flip.
  return (
    <div
      className={`fixed inset-0 z-[70] overflow-hidden transition-transform duration-300 ease-out ${
        open ? "translate-x-0" : "-translate-x-full pointer-events-none"
      } min-[860px]:static min-[860px]:inset-auto min-[860px]:z-auto min-[860px]:h-full min-[860px]:max-w-[82vw] min-[860px]:flex-none min-[860px]:translate-x-0 min-[860px]:pointer-events-auto min-[860px]:transition-[width] min-[860px]:duration-300 min-[860px]:ease-out ${
        open ? "min-[860px]:w-[288px]" : "min-[860px]:w-0"
      }`}
    >
      <div
        // z-[60] clears both the header (z-20) and the fixed "now playing"
        // bar (z-50) — safe to just stack on top of the header rather than
        // reserve space below it, since Reader.tsx hides the header outright
        // for as long as the outline is open. Below the desktop breakpoint
        // the outer fixed wrapper is already z-[70], clearing all of that
        // on its own.
        className="relative h-full w-full min-[860px]:w-[288px] min-[860px]:z-[60] min-[860px]:max-w-[82vw] bg-[var(--reader-surface)] min-[860px]:border-r min-[860px]:border-[var(--reader-border)] flex flex-col overflow-hidden box-border select-none no-callout"
      >
        <div className="flex items-start justify-between gap-2 px-5 pt-6 pb-4 flex-none">
          <div className="flex items-start gap-3 min-w-0">
            <img
              src={book.metadata.cover}
              alt="cover"
              className="w-11 h-16 object-cover rounded-xs flex-none shadow-sm"
            />
            <div className="min-w-0 pt-0.5">
              <div className="text-sm font-semibold font-serif text-[var(--reader-text)] leading-tight">
                {book.metadata.title}
              </div>
              <div className="text-xs text-[var(--reader-text-muted)] mt-0.5 truncate">
                {book.metadata.author}
              </div>
              <div className="flex items-center gap-2 mt-2.5">
                <div className="w-16 h-[3px] rounded-full bg-[var(--reader-surface-hover)] overflow-hidden flex-none">
                  <div
                    className="h-full bg-brand-500 rounded-full"
                    style={{ width: `${Math.round(scrollPct * 100)}%` }}
                  />
                </div>
                <span className="text-[10.5px] font-medium text-[var(--reader-text-muted)] whitespace-nowrap">
                  {Math.round(scrollPct * 100)}% complete
                </span>
              </div>
            </div>
          </div>
          <Tooltip label="Close" side="bottom">
            <button
              onClick={onClose}
              aria-label="Close table of contents"
              className="w-7 h-7 rounded-md flex items-center justify-center flex-none border-none bg-transparent cursor-pointer text-[var(--reader-text-muted)] hover:bg-[var(--reader-surface-hover)]"
            >
              <X size={15} />
            </button>
          </Tooltip>
        </div>

        <div className="om-scroll flex-1 overflow-y-auto px-4 pb-5">
          {sidebarRows.map(({ section, depth, isGroup }) => {
            const hasContent = section.passages.length > 0;
            const isCurrent = section.id === activeSectionId;
            if (isGroup) {
              return (
                <div
                  key={section.id}
                  style={{ paddingLeft: depth * 14 }}
                  className="pt-4 first:pt-1 pb-1.5 px-2.5 text-[10px] font-bold tracking-wider uppercase text-[var(--reader-text-subtle)]"
                >
                  {section.title}
                </div>
              );
            }
            return (
              <div
                key={section.id}
                onClick={() => {
                  if (hasContent) onNavigate(section.id);
                  if (isMobile) onClose();
                }}
                style={{ paddingLeft: 10 + depth * 14 }}
                className={`flex items-center py-3 pr-2.5 rounded-sm mb-0.5 ${
                  hasContent ? "cursor-pointer" : "cursor-default opacity-50"
                } ${isCurrent ? "bg-brand-500/10" : "bg-transparent"}`}
              >
                <span
                  className={`flex-1 text-sm leading-snug ${
                    isCurrent ? "font-semibold text-brand-500" : "font-medium text-[var(--reader-text-muted)]"
                  }`}
                >
                  {section.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
