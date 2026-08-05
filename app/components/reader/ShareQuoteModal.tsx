"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { domToBlob } from "modern-screenshot";
import QuoteCard from "./notes/QuoteCard";
import { truncateQuote } from "./notes/Quote";
import { PLATFORM_HOST } from "@/lib/config/platform";

// Long enough that most highlighted passages still show in full, short
// enough that the card's now-natural (unclamped) height stays in the
// squarish range this is tuned for rather than growing very tall — same
// word-boundary truncation Quote.tsx uses for the notes panel, just a
// longer cap since this card has a lot more room.
const SHARE_QUOTE_MAX_CHARS = 260;

type Props = {
  quote: string;
  author: string;
  bookTitle: string;
  coverSrc: string;
  onClose: () => void;
};

/** Strips a trailing "; " left over from multi-author source metadata that
 * only ever resolved to one name here (e.g. "Cedric J. Robinson;") — purely
 * a display cleanup for this card, not a fix to the underlying data, so it
 * doesn't touch how the author renders anywhere else in the app. */
function cleanAuthor(author: string): string {
  return author.replace(/[;,\s]+$/, "");
}

const EXPORT_FILENAME = "ominira-quote.png";

async function renderBlob(node: HTMLElement): Promise<Blob> {
  return domToBlob(node, {
    scale: 2,
    backgroundColor: getComputedStyle(node).backgroundColor,
  });
}

/**
 * Preview + export for a book passage as a shareable image — the card
 * itself reuses QuoteCard exactly as it appears elsewhere in the reader
 * (same sunken surface, same quote glyph), so what a reader shares matches
 * what they've been looking at, rather than a separately-designed graphic.
 * Rasterizing is strictly client-side (modern-screenshot draws the live DOM
 * node to a canvas) — no server round-trip, no image ever leaves the
 * device except via the share/download the reader explicitly triggers.
 *
 * modern-screenshot rather than html-to-image (the first pass here) — the
 * latter left a solid black bar down one edge of the exported PNG on
 * Safari/WebKit, a known unresolved issue with its SVG-foreignObject
 * serialization; modern-screenshot is a maintained fork built specifically
 * to fix that class of cross-browser export bug.
 */
export default function ShareQuoteModal({ quote, author, bookTitle, coverSrc, onClose }: Props) {
  const { shown: quoteShown } = truncateQuote(quote, SHARE_QUOTE_MAX_CHARS);
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  // A real (not just present) capability check, computed once as lazy
  // initial state rather than an effect — this component only ever mounts
  // client-side (after a reader clicks Share), so `navigator` is always
  // available by the time this runs. canShare({ files }) is what actually
  // distinguishes "has navigator.share" (most desktop browsers, URL/text
  // only) from "can share a File" (mainly mobile) — same reasoning as
  // ShareButton.tsx's own feature test.
  const [canShareFiles] = useState(
    () =>
      typeof navigator.share === "function" &&
      navigator.canShare?.({ files: [new File([], EXPORT_FILENAME, { type: "image/png" })] }) === true
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onDownload = async () => {
    if (!cardRef.current || busy) return;
    setBusy("download");
    try {
      const blob = await renderBlob(cardRef.current);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = EXPORT_FILENAME;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(null);
    }
  };

  const onShare = async () => {
    if (!cardRef.current || busy) return;
    setBusy("share");
    try {
      const blob = await renderBlob(cardRef.current);
      const file = new File([blob], EXPORT_FILENAME, { type: "image/png" });
      await navigator.share({ files: [file] });
    } catch {
      // Reader dismissed the native share sheet — not an error.
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      onClick={onClose}
      className={`w-full h-full box-border bg-black/45 flex justify-center ${
        isMobile ? "items-stretch p-0" : "items-center py-10 px-6"
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full bg-[var(--reader-surface)] shadow-lg flex flex-col box-border overflow-hidden ${
          isMobile ? "h-full rounded-none" : "max-w-[560px] max-h-[90vh] rounded-lg"
        }`}
      >
        <div className="flex flex-none items-center justify-between border-b border-[var(--reader-border)] px-4 py-3.5">
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex cursor-pointer items-center justify-center border-none bg-transparent text-[var(--reader-text)]"
          >
            <X size={20} />
          </button>
          <span className="text-sm font-bold text-[var(--reader-text)]">Share</span>
          <div className="flex items-center gap-4">
            <button
              onClick={onDownload}
              disabled={busy !== null}
              aria-label="Download image"
              className="flex cursor-pointer items-center justify-center border-none bg-transparent text-[var(--reader-text)] disabled:cursor-default disabled:opacity-40"
            >
              <Download size={20} />
            </button>
            {canShareFiles && (
              <button
                onClick={onShare}
                disabled={busy !== null}
                aria-label="Share image"
                className="flex cursor-pointer items-center justify-center border-none bg-transparent text-[var(--reader-text)] disabled:cursor-default disabled:opacity-40"
              >
                <Share size={20} />
              </button>
            )}
          </div>
        </div>

        <div className="om-scroll flex-1 overflow-y-auto p-3">
          {/* The card being exported — sized by width only (no forced
              aspect-ratio/overflow-hidden), so height always grows to
              exactly fit its content: a quote can never be clipped, and
              there's never dead space padding out a short one either. The
              padding/type below is tuned so a typical (truncated-length)
              quote comes out close to square — the shape Twitter/WhatsApp
              both crop toward — without hard-forcing a ratio that would
              either clip a long quote or leave a short one floating in
              empty space. No inset around the card itself: the whole box
              is the image, edge to edge, not an object on visible padding. */}
          <div
            ref={cardRef}
            style={{ background: "var(--reader-surface)" }}
            className="mx-auto flex w-full flex-col p-8"
          >
            <QuoteCard>
              <p className="m-0 font-serif text-[24px] leading-[1.45] text-[var(--reader-text)]">{quoteShown}</p>
            </QuoteCard>

            <div className="flex flex-none flex-col gap-6 pt-8">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- captured into a canvas by modern-screenshot, which needs a plain <img> it can inline as a data URL, not next/image's lazy/srcset output. */}
                <img
                  src={coverSrc}
                  alt=""
                  className="h-16 w-11 flex-none rounded-xs border border-[var(--reader-border)] object-cover"
                />
                <div className="min-w-0">
                  <p className="m-0 truncate text-base font-bold text-[var(--reader-text)]">{cleanAuthor(author)}</p>
                  <p className="m-0 truncate text-sm font-medium text-[var(--reader-text-muted)]">{bookTitle}</p>
                </div>
              </div>

              <div className="text-center">
                <span className="font-serif text-base font-bold tracking-[0.15em] text-brand-500">{PLATFORM_HOST}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
