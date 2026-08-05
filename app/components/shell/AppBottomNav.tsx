"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./navItems";
import { useReaderOverlayStore } from "@/stores/reader-overlay-store";
import { useLayoutStore } from "@/stores/layout-store";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Mobile tab bar (hidden at the same 860px breakpoint AppSidebar takes over
 * at). Always pinned to the true bottom edge — the persistent NowPlayingBar
 * is the one that gives way, floating above this bar (and above its own
 * rendered height, published below) rather than the other way around, same
 * as e.g. Spotify's mini player sitting above its tab bar rather than
 * covering or displacing it.
 */
export default function AppBottomNav() {
  const pathname = usePathname();
  const overlayOpen = useReaderOverlayStore((s) => s.open);
  const setBottomNavHeight = useLayoutStore((s) => s.setBottomNavHeight);
  const navRef = useRef<HTMLElement>(null);

  // Published so other fixed-position mobile chrome (HomeInstallBanner's
  // compact footer) can stack directly above this bar — same measure-and-
  // store trick NowPlayingBar already uses for playerHeight.
  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setBottomNavHeight(entries[0].contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, [setBottomNavHeight]);

  // See AppSidebar's own onNavClick comment — same soft-navigation-leaves-
  // interception-state-confused reasoning, just the mobile tab bar's copy
  // of it.
  const onNavClick = overlayOpen
    ? (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        window.location.href = e.currentTarget.href;
      }
    : undefined;

  return (
    <nav
      ref={navRef}
      className="shell:hidden fixed left-0 right-0 bottom-0 z-40 flex items-stretch border-t border-[var(--reader-border)] bg-[var(--reader-surface)] select-none no-callout"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavClick}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 no-underline text-xs font-bold ${
              active ? "text-brand-500" : "text-[var(--reader-text-muted)]"
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
