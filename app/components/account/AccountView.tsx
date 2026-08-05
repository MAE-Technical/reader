"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import AppHeader from "@/app/components/shell/AppHeader";
import Loader from "@/app/components/Loader";
import ThemeToggle from "@/app/components/shell/ThemeToggle";
import { useInstallBannerStore } from "@/stores/install-banner-store";
import { useInstallPrompt } from "@/lib/pwa/useInstallPrompt";
import { useIsAuthenticated } from "@/lib/auth/useIsAuthenticated";
import { useProfile } from "@/lib/auth/useProfile";
import { useLogout } from "@/lib/auth/useLogout";
import { useContinueReading } from "@/lib/auth/useContinueReading";
import { avatarColor, avatarInitial } from "@/lib/reader/authorDisplay";

function handleFor(name: string): string {
  return `@${name.toLowerCase().replace(/\s+/g, ".")}`;
}

const APP_VERSION = "0.1.0";

const ACCORDION: Record<"ios" | "other", { label: string; body: string }> = {
  ios: {
    label: "iOS (Safari)",
    body: "Share icon → Add to Home Screen → Add. Full walkthrough on the home feed's install card.",
  },
  other: {
    label: "Chrome (or other browsers)",
    body: "Menu (⋮) → Install Ominira, or tap Install above if the prompt already appeared.",
  },
};

/** The calm, always-there install option — no dismiss/cooldown, unlike
 * HomeInstallBanner's assertive feed banner. An explicit iOS/Chrome
 * accordion (rather than auto-detecting one platform) since a reader
 * browsing Account at their leisure might want to check either set of
 * steps — each just points back at the fuller walkthrough (HomeInstallBanner
 * on the feed) rather than repeating the numbered steps itself.
 */
function AccountInstallCard() {
  const [open, setOpen] = useState<"ios" | "other" | null>(null);
  const { canPrompt, promptInstall, platform, isInstalled } = useInstallPrompt();
  const hasHydrated = useInstallBannerStore((s) => s.hasHydrated);

  if (!hasHydrated || isInstalled) return null;

  const primaryLabel = canPrompt ? "Install Ominira" : platform === "ios" ? "Add to Home Screen" : "How to install";
  const onPrimaryClick = canPrompt ? promptInstall : () => setOpen(platform === "ios" ? "ios" : "other");

  return (
    <div className="mb-6 rounded-md border border-[var(--reader-border)] p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <img
          src="/icons/icon-192.png"
          alt=""
          className="h-7 w-7 flex-none rounded-xs border border-[var(--reader-border)] object-cover object-[center_20%]"
        />
        <p className="m-0 text-[15px] font-semibold text-[var(--reader-text)]">Install Ominira</p>
      </div>

      <button
        type="button"
        onClick={onPrimaryClick}
        className="w-full cursor-pointer rounded-md border border-transparent bg-[var(--reader-accent)] px-3 py-2.5 text-[15px] font-semibold text-white transition-colors hover:opacity-90"
      >
        {primaryLabel}
      </button>

      <div className="mt-3.5 flex flex-col gap-0.5 border-t border-[var(--reader-border)] pt-3">
        {(["ios", "other"] as const).map((key) => (
          <div key={key}>
            <button
              type="button"
              onClick={() => setOpen((s) => (s === key ? null : key))}
              className="flex w-full cursor-pointer items-center justify-between rounded-sm border-none bg-transparent px-0.5 py-2 text-[13px] font-medium text-[var(--reader-text)]"
            >
              {ACCORDION[key].label}
              <ChevronRight size={15} className="text-[var(--reader-text-subtle)]" />
            </button>
            {open === key && (
              <p className="m-0 pb-2 pl-0.5 pt-0.5 text-sm font-normal leading-relaxed text-[var(--reader-text-muted)]">
                {ACCORDION[key].body}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AccountView() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const { data: reader } = useProfile();
  const logout = useLogout();

  // Real "books started" count — GET /api/auth/me/continue-reading already
  // only lists materials with a saved position (api-spec.md), so this is a
  // straight count, no local computation needed. There's no equivalent
  // aggregate endpoint for "notes made across every book" (api-spec.md has
  // no "my notes" listing), so that second stat tile from the old
  // local-only version is dropped rather than shown with fabricated data.
  const { data: continueReading } = useContinueReading();
  const booksStarted = continueReading?.length;

  // AccountInstallCard needs this rehydrated independently of
  // HomeInstallBanner, since a reader landing straight on /account (not via
  // /home) would otherwise never trigger it.
  useEffect(() => {
    useInstallBannerStore.persist.rehydrate();
  }, []);

  return (
    <div className="pb-10">
      <AppHeader />

      <h1 className="mt-1 mb-6 font-serif text-2xl font-semibold text-[var(--reader-text)]">Account</h1>

      {isAuthenticated && !reader ? (
        <div className="relative min-h-[240px]">
          <Loader confined />
        </div>
      ) : isAuthenticated && reader ? (
        <>
          <div className="mb-5 flex flex-col items-center gap-2.5 text-center">
            <span
              style={{ background: avatarColor(reader.pseudonym) }}
              className="flex h-[72px] w-[72px] flex-none items-center justify-center rounded-full text-2xl font-semibold text-white"
            >
              {avatarInitial(reader.pseudonym)}
            </span>
            <div>
              <div className="font-sans text-xl font-bold text-[var(--reader-text)]">{reader.pseudonym}</div>
              <div className="text-[13px] font-medium text-[var(--reader-text-muted)]">
                {handleFor(reader.pseudonym)}
                {reader.city && reader.country ? ` · ${reader.city}, ${reader.country}` : ""}
              </div>
            </div>
          </div>

          <div className="mb-5 flex gap-2.5">
            <div className="flex-1 rounded-md border border-[var(--reader-border)] p-3.5 text-center">
              <div className="font-serif text-[22px] font-semibold text-[var(--reader-accent)]">
                {booksStarted ?? "–"}
              </div>
              <div className="mt-1 text-xs font-medium text-[var(--reader-text-subtle)]">Books started</div>
            </div>
          </div>

          <div className="mb-5 overflow-hidden rounded-md border border-[var(--reader-border)]">
            {(
              [
                ["Email", reader.email],
                ["Pseudonym", reader.pseudonym],
                ["Country", reader.country ?? "—"],
                ["City", reader.city ?? "—"],
              ] as const
            ).map(([label, value], i) => (
              <div
                key={label}
                className={`flex items-center justify-between px-3.5 py-2.5 ${
                  i > 0 ? "border-t border-[var(--reader-border)]" : ""
                }`}
              >
                <span className="text-xs font-medium text-[var(--reader-text-subtle)]">{label}</span>
                <span className="text-[13px] font-medium text-[var(--reader-text)]">{value}</span>
              </div>
            ))}
          </div>

          <div className="mb-5 flex items-center justify-between">
            <span className="text-[13px] font-medium text-[var(--reader-text)]">Theme</span>
            <ThemeToggle />
          </div>

          <div className="mb-5 text-center">
            <button
              type="button"
              onClick={() => logout.mutate(undefined, { onSuccess: () => router.push("/auth") })}
              disabled={logout.isPending}
              className="cursor-pointer border-none bg-transparent p-0 text-[13px] font-medium text-[var(--reader-text-muted)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {logout.isPending ? "Logging out…" : "Log out"}
            </button>
          </div>

          <div className="border-t border-[var(--reader-border)] pt-3.5 text-center">
            <p className="mx-auto mb-0 max-w-[260px] text-xs font-medium leading-relaxed text-[var(--reader-text-subtle)]">
              A curated library of Pan-African and revolutionary political thought — free to browse.
            </p>
            <p className="mt-2 mb-0 text-xs font-medium text-[var(--reader-text-muted)]">
              Raise your consciousness.
            </p>
            <p className="mt-1 mb-0 text-xs font-medium text-[var(--reader-text-subtle)]">Ominira · v{APP_VERSION}</p>
          </div>
        </>
      ) : (
        <>
          <div className="mb-5 overflow-hidden rounded-md border border-[var(--reader-border)]">
            <Link
              href="/auth/login"
              className="flex cursor-pointer items-center justify-between border-b border-[var(--reader-border)] px-3.5 py-3 no-underline"
            >
              <span className="text-sm font-medium text-[var(--reader-text)]">Log in</span>
              <ChevronRight size={16} className="text-[var(--reader-text-subtle)]" />
            </Link>
            <Link
              href="/auth/signup"
              className="flex cursor-pointer items-center justify-between px-3.5 py-3 no-underline"
            >
              <span className="text-sm font-medium text-[var(--reader-text)]">Join the movement</span>
              <ChevronRight size={16} className="text-[var(--reader-text-subtle)]" />
            </Link>
          </div>

          <div className="mb-5 flex items-center justify-between">
            <span className="text-[13px] font-medium text-[var(--reader-text)]">Theme</span>
            <ThemeToggle />
          </div>

          <AccountInstallCard />

          <div className="border-t border-[var(--reader-border)] pt-3.5 text-center">
            <p className="m-0 text-xs font-medium text-[var(--reader-text-muted)]">
            Raise your consciousness.
            </p>
            <p className="mt-1 mb-0 text-xs font-medium text-[var(--reader-text-subtle)]">Ominira · v{APP_VERSION}</p>
          </div>
        </>
      )}
    </div>
  );
}
