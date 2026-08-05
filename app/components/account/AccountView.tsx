"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import AppHeader from "@/app/components/shell/AppHeader";
import ThemeToggle from "@/app/components/shell/ThemeToggle";
import { useLibraryStore } from "@/stores/library-store";
import { useInstallBannerStore } from "@/stores/install-banner-store";
import { useInstallPrompt } from "@/lib/pwa/useInstallPrompt";
import { useIsAuthenticated } from "@/lib/auth/useIsAuthenticated";
import { CURRENT_READER_NAME } from "@/lib/reader/currentAuthor";
import { avatarColor, avatarInitial } from "@/lib/reader/authorDisplay";

function handleFor(name: string): string {
  return `@${name.toLowerCase().replace(/\s+/g, ".")}`;
}

// No real auth/profile backend yet (see useIsAuthenticated's own comment) —
// these stand in for what a real account object will supply, the same
// "seam" CURRENT_READER_NAME already is for the name/avatar below.
const MOCK_ACCOUNT_DETAILS = { email: "yeast@ominira.app", country: "Ghana", city: "Accra" };

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
  const isAuthenticated = useIsAuthenticated();

  const hasHydrated = useLibraryStore((s) => s.hasHydrated);
  const books = useLibraryStore((s) => s.books);

  // library-store skips automatic persist hydration (see its own doc
  // comment) so the server and first client paint agree — rehydrated here
  // the same way LibraryView/Reader.tsx do, since the stats below read the
  // real saved positions/notes.
  useEffect(() => {
    useLibraryStore.persist.rehydrate();
  }, []);

  // Same reasoning as library-store above — AccountInstallCard needs this
  // rehydrated independently of HomeInstallBanner, since a reader landing
  // straight on /account (not via /home) would otherwise never trigger it.
  useEffect(() => {
    useInstallBannerStore.persist.rehydrate();
  }, []);

  const { booksStarted, notesMade } = useMemo(() => {
    const entries = Object.values(books);
    return {
      booksStarted: entries.filter((b) => b.position !== undefined).length,
      notesMade: entries.reduce((sum, b) => sum + Object.keys(b.notes.byId).length, 0),
    };
  }, [books]);

  return (
    <div className="pb-10">
      <AppHeader />

      <h1 className="mt-1 mb-6 font-serif text-2xl font-semibold text-[var(--reader-text)]">Account</h1>

      {isAuthenticated ? (
        <>
          <div className="mb-5 flex flex-col items-center gap-2.5 text-center">
            <span
              style={{ background: avatarColor(CURRENT_READER_NAME) }}
              className="flex h-[72px] w-[72px] flex-none items-center justify-center rounded-full text-2xl font-semibold text-white"
            >
              {avatarInitial(CURRENT_READER_NAME)}
            </span>
            <div>
              <div className="font-sans text-xl font-bold text-[var(--reader-text)]">{CURRENT_READER_NAME}</div>
              <div className="text-[13px] font-medium text-[var(--reader-text-muted)]">
                {handleFor(CURRENT_READER_NAME)} · {MOCK_ACCOUNT_DETAILS.city}, {MOCK_ACCOUNT_DETAILS.country}
              </div>
            </div>
          </div>

          <div className="mb-5 flex gap-2.5">
            <div className="flex-1 rounded-md border border-[var(--reader-border)] p-3.5 text-center">
              <div className="font-serif text-[22px] font-semibold text-[var(--reader-accent)]">
                {hasHydrated ? booksStarted : "–"}
              </div>
              <div className="mt-1 text-xs font-medium text-[var(--reader-text-subtle)]">Books started</div>
            </div>
            <div className="flex-1 rounded-md border border-[var(--reader-border)] p-3.5 text-center">
              <div className="font-serif text-[22px] font-semibold text-[var(--reader-accent)]">
                {hasHydrated ? notesMade : "–"}
              </div>
              <div className="mt-1 text-xs font-medium text-[var(--reader-text-subtle)]">Notes made</div>
            </div>
          </div>

          <div className="mb-5 overflow-hidden rounded-md border border-[var(--reader-border)]">
            {(
              [
                ["Email", MOCK_ACCOUNT_DETAILS.email],
                ["Pseudonym", CURRENT_READER_NAME],
                ["Country", MOCK_ACCOUNT_DETAILS.country],
                ["City", MOCK_ACCOUNT_DETAILS.city],
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
            {/* No real auth/session system yet (reader-identity-store is
                anonymous device identity, not an account) — useIsAuthenticated
                is the seam a real session check plugs into. Until then
                isAuthenticated is always false, so this never renders. */}
            <Link href="/auth" className="text-[13px] font-medium text-[var(--reader-text-muted)] no-underline">
              Log out
            </Link>
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
