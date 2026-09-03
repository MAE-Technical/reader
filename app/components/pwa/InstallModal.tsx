"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { useInstallPrompt } from "@/lib/pwa/useInstallPrompt";
import InstallReferenceCard from "@/app/components/pwa/InstallReferenceCard";

/**
 * The "Install app" dialog — opened whenever there's no native
 * `beforeinstallprompt` to fire directly (InstallBanner's Install button
 * falls straight through to `promptInstall` when there is one, so this
 * never opens on that path). A real centered overlay, not another inline
 * card competing with the feed around it: backdrop click, Escape, and the
 * header's own close button all dismiss it, and background scroll is locked
 * while it's open.
 *
 * iOS-in-the-wrong-browser (Chrome/Firefox/Edge/Opera on iOS — see
 * useInstallPrompt's detectRequiresSafariRedirect) gets its own "Open in
 * Safari" callout up top, with the tab switcher shown dimmed underneath as
 * a preview of what's waiting once the reader's actually in Safari
 * (InstallReferenceCard's own `dimmed` variant) — rather than a bare
 * redirect prompt with nothing to show for it.
 */
export default function InstallModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { platform, requiresSafariRedirect } = useInstallPrompt();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const openInSafari = () => {
    window.location.href = `x-safari-${window.location.href}`;
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-[400px] flex-col overflow-hidden rounded-xl bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-none items-center justify-between border-b border-sand-200 px-4 py-3.5">
          <h2 className="m-0 text-[13px] font-bold text-sand-950">Install Ominira app</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex-none cursor-pointer rounded-sm border-none bg-transparent p-1 text-sand-500 hover:bg-sand-75 hover:text-sand-950"
          >
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-3.5">
          {requiresSafariRedirect && (
            <div className="mb-3.5 rounded-md border border-brand-300 bg-quote-wash p-3.5">
              <p className="m-0 mb-2.5 text-[12.5px] leading-relaxed text-sand-950">
                iOS only allows adding to your home screen from Safari — not from this browser.
              </p>
              <button
                type="button"
                onClick={openInSafari}
                className="cursor-pointer rounded-md border border-transparent bg-brand-500 px-3.5 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-600"
              >
                Open in Safari
              </button>
            </div>
          )}
          <InstallReferenceCard platform={platform} dimmed={requiresSafariRedirect} />
        </div>
      </div>
    </div>
  );
}
