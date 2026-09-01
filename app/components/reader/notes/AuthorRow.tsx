"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { avatarColor, avatarInitial, comradeName } from "@/lib/reader/authorDisplay";
import { formatShortTimeAgo } from "@/lib/reader/timeAgo";
import { pseudonymToSlug } from "@/lib/reader/profileSlug";

/** Avatar + pseudonym + relative time — the identity row every note and
 * reply leads with. Reads correctly with today's single hardcoded author
 * and with real multiple authors later, without changes (see
 * lib/reader/authorDisplay.ts). Takes an optional trailing `menu` slot
 * (same pattern as PanelShell's `headerMenu`) — the per-entry overflow
 * trigger lives here, anchored with the author/time metadata it actually
 * manages, rather than down in the react/reply action row below the
 * content, where its position would drift with content length. */
export default function AuthorRow({
  name,
  savedAt,
  size = "default",
  menu,
}: {
  name: string;
  savedAt: number;
  /** Reply-tier entries render smaller than top-level notes. */
  size?: "default" | "small";
  menu?: ReactNode;
}) {
  const small = size === "small";
  const displayName = comradeName(name);
  const profileHref = `/@${pseudonymToSlug(name)}`;
  return (
    <div className="flex items-center gap-2">
      <Link href={profileHref} className="flex flex-none no-underline">
        <span
          style={{ background: avatarColor(displayName) }}
          className={`flex flex-none items-center justify-center rounded-sm font-bold text-white ${
            small ? "h-4 w-4 text-[10px]" : "h-5 w-5 text-xs"
          }`}
        >
          {avatarInitial(displayName)}
        </span>
      </Link>
      <div className="flex items-baseline gap-1.5">
        <Link
          href={profileHref}
          className={`font-bold capitalize text-[var(--reader-text)] no-underline hover:underline ${
            small ? "text-[11px]" : "text-xs"
          }`}
        >
          {displayName}
        </Link>
        <span
          className={`font-medium text-[var(--reader-text-muted)] ${
            small ? "text-[10px]" : "text-[11px]"
          }`}
        >
          {formatShortTimeAgo(savedAt)}
        </span>
      </div>
      {menu}
    </div>
  );
}
