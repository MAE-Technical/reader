"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useInstallPrompt } from "@/lib/pwa/useInstallPrompt";
import { useScrolledPast } from "@/lib/dom/useScrolledPast";
import {
  INSTALL_BANNER_COOLDOWN_MS,
  INSTALL_BANNER_LONG_COOLDOWN_MS,
  useInstallBannerStore,
} from "@/stores/install-banner-store";
import { useAudioStore } from "@/stores/audio-store";
import { useLayoutStore } from "@/stores/layout-store";
import InstallSteps from "@/app/components/pwa/InstallSteps";

/**
 * The assertive, dismissible install surface — AccountView also carries a
 * calm, always-there "Install app" card for readers who dismissed this one.
 * A fixed light card, not reader-theme reactive (see MissionCard's own
 * comment for why). Mobile-only; hides itself for good once actually
 * installed (useInstallPrompt's isInstalled, which — unlike raw
 * display-mode detection — also remembers a past install across tabs/
 * sessions), and reappears after a cooldown if dismissed without installing
 * (see install-banner-store's INSTALL_BANNER_COOLDOWN_MS). Once scrolled
 * past, a compact bar keeps the install CTA reachable, fixed directly above
 * AppBottomNav (and NowPlayingBar, when a book is also loaded for
 * listening) rather than pulling the reader back up the feed.
 *
 * iOS browsers other than Safari itself (Chrome/Firefox/Edge/Opera on iOS —
 * all still WebKit, but only Safari exposes "Add to Home Screen") get their
 * own highlighted state instead of the numbered steps, since those steps
 * are simply wrong there — "Open in Safari" hands off via the x-safari-
 * URL scheme, the standard trick for making iOS reopen the current page in
 * Safari itself from inside another browser/webview. This state is
 * deliberately unreachable in actual Safari — requiresSafariRedirect is
 * only ever true when you're *not* already in Safari (see
 * useInstallPrompt's detectRequiresSafariRedirect), so testing it means
 * opening the site in Chrome/Firefox on an iPhone/iPad, not Safari itself.
 */
export default function HomeInstallBanner() {
  const [expanded, setExpanded] = useState(false);
  const { canPrompt, promptInstall, platform, requiresSafariRedirect, isInstalled } = useInstallPrompt();
  const dismissedAt = useInstallBannerStore((s) => s.dismissedAt);
  const dismissCount = useInstallBannerStore((s) => s.dismissCount);
  const hasHydrated = useInstallBannerStore((s) => s.hasHydrated);
  const dismiss = useInstallBannerStore((s) => s.dismiss);
  const bottomNavHeight = useLayoutStore((s) => s.bottomNavHeight);
  const playerHeight = useAudioStore((s) => s.playerHeight);
  const anyPlayerActive = useAudioStore((s) => s.book !== null);

  const { setNode, past: scrolledPast } = useScrolledPast<HTMLDivElement>();

  // install-banner-store skips automatic persist hydration (see
  // reader-identity-store's own doc comment for why) so the server and
  // first client paint agree — rehydrated here the same way Reader.tsx
  // does for reader-identity-store.
  useEffect(() => {
    useInstallBannerStore.persist.rehydrate();
  }, []);

  if (!hasHydrated || isInstalled) return null;
  // First dismiss gets the short cooldown; every dismiss after that gets
  // the long one (see install-banner-store's own doc comment for why).
  const cooldownMs = dismissCount > 1 ? INSTALL_BANNER_LONG_COOLDOWN_MS : INSTALL_BANNER_COOLDOWN_MS;
  // A stale cooldown read is harmless here (worst case: the banner
  // reappears a render late), and there's no external-store equivalent for
  // "has this timestamp elapsed."
  // eslint-disable-next-line react-hooks/purity
  if (dismissedAt !== null && Date.now() - dismissedAt < cooldownMs) return null;

  const openInSafari = () => {
    window.location.href = `x-safari-${window.location.href}`;
  };

  if (requiresSafariRedirect) {
    return (
      <>
        <div
          ref={setNode}
          className="relative mb-6 rounded-md border border-brand-300 bg-quote-wash p-4 shell:hidden"
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute right-3 top-3 cursor-pointer rounded-sm border-none bg-transparent p-1 text-sand-500 hover:bg-black/5 hover:text-sand-950"
          >
            <X size={16} />
          </button>
          <h2 className="m-0 mb-1 max-w-[85%] text-[15px] font-semibold text-sand-950">
            Open this in Safari to install
          </h2>
          <p className="m-0 mb-3 text-sm font-normal leading-relaxed text-sand-600">
            iOS only allows adding to your home screen from Safari — not from this browser.
          </p>
          <button
            type="button"
            onClick={openInSafari}
            className="cursor-pointer rounded-md border border-transparent bg-brand-500 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-600"
          >
            Open in Safari
          </button>
        </div>

        {scrolledPast && (
          <div
            className="fixed inset-x-0 z-40 flex items-center gap-2.5 border-t border-sand-200 bg-white px-4 py-2.5 shadow-md shell:hidden"
            style={{ bottom: bottomNavHeight + (anyPlayerActive ? playerHeight : 0) }}
          >
            <img src="/icons/icon-192.png" alt="" className="h-6 w-6 flex-none rounded-xs object-cover object-[center_20%]" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-sand-950">
              Install Ominira
            </span>
            <button
              type="button"
              onClick={openInSafari}
              className="flex-none cursor-pointer rounded-sm border border-transparent bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
            >
              Open in Safari
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="flex-none cursor-pointer rounded-sm border-none bg-transparent p-1 text-sand-500 hover:bg-black/5 hover:text-sand-950"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </>
    );
  }

  const onLinkClick = canPrompt ? promptInstall : () => setExpanded((e) => !e);

  return (
    <>
      <div ref={setNode} className="relative mb-6 rounded-md border border-sand-200 bg-white p-4 shell:hidden">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="absolute right-3 top-3 cursor-pointer rounded-sm border-none bg-transparent p-1 text-sand-500 hover:bg-sand-75 hover:text-sand-950"
        >
          <X size={16} />
        </button>

        {expanded ? (
          <>
            <div className="mb-3.5 flex items-center gap-2.5 pr-6">
              <img
                src="/icons/icon-192.png"
                alt=""
                className="h-8 w-8 flex-none rounded-xs border border-sand-200 object-cover object-[center_20%]"
              />
              <h2 className="m-0 text-[15px] font-semibold text-sand-950">Add to your home screen</h2>
            </div>
            <InstallSteps platform={platform} requiresSafariRedirect={false} />
          </>
        ) : (
          <div className="flex gap-3 pr-6">
            <img
              src="/icons/icon-192.png"
              alt=""
              className="h-10 w-10 flex-none rounded-xs border border-sand-200 object-cover object-[center_20%]"
            />
            <div className="flex-1">
              <h2 className="m-0 mb-1 text-[15px] font-semibold text-sand-950">
                Read anywhere. Install Ominira directly.
              </h2>
              {/* <p className="m-0 mb-3 text-sm font-normal leading-relaxed text-sand-600">
                We are a revolutionary movement. We won't put Ominira at the mercy of imperialist corporations like Apple & Google, gatekeepers who can deplatform us. This is why we are using something called a Progressive Web App (PWA). 
                It works exactly like an app but they can't touch it.
              </p> */}
              <button
                type="button"
                onClick={onLinkClick}
                className="cursor-pointer border-none bg-transparent p-0 text-[13px] font-medium text-brand-500 hover:text-brand-600"
              >
                {canPrompt ? "Install Ominira ›" : "How to install ›"}
              </button>
            </div>
          </div>
        )}
      </div>

      {scrolledPast && (
        <div
          className="fixed inset-x-0 z-40 flex items-center gap-2.5 border-t border-sand-200 bg-white px-4 py-2.5 shadow-md shell:hidden"
          style={{ bottom: bottomNavHeight + (anyPlayerActive ? playerHeight : 0) }}
        >
          <img src="/icons/icon-192.png" alt="" className="h-6 w-6 flex-none rounded-xs object-cover object-[center_20%]" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-sand-950">
            Install Ominira
          </span>
          <button
            type="button"
            onClick={canPrompt ? promptInstall : () => setExpanded(true)}
            className="flex-none cursor-pointer rounded-sm border border-transparent bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-600"
          >
            {canPrompt ? "Install" : "How to install"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="flex-none cursor-pointer rounded-sm border-none bg-transparent p-1 text-sand-500 hover:bg-sand-75 hover:text-sand-950"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
}
