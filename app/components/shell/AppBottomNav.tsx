"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./navItems";
import { useAudioStore } from "@/stores/audio-store";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Mobile tab bar (hidden at the same 860px breakpoint AppSidebar takes over
 * at). Offsets itself above the persistent NowPlayingBar when a book is
 * playing — same `playerHeight`-as-bottom-offset trick Reader.tsx already
 * uses for ChapterNavFooter/SelectionMenu — so the two never overlap.
 */
export default function AppBottomNav() {
  const pathname = usePathname();
  const anyPlayerActive = useAudioStore((s) => s.book !== null);
  const playerHeight = useAudioStore((s) => s.playerHeight);

  return (
    <nav
      className="min-[860px]:hidden fixed left-0 right-0 z-40 flex items-stretch border-t border-[var(--reader-border)] bg-[var(--reader-surface)] select-none no-callout"
      style={{
        bottom: anyPlayerActive ? playerHeight : 0,
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 no-underline text-[11px] font-medium ${
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
