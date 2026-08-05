"use client";

import { useRouter } from "next/navigation";
import { useIsAuthenticated } from "@/lib/auth/useIsAuthenticated";
import { useScrolledPast } from "@/lib/dom/useScrolledPast";
import MissionCard from "@/app/components/auth/MissionCard";

/**
 * The old dedicated /auth landing page's job — recruiting an anonymous
 * reader into an account — folded into the home feed instead of a page you
 * only ever see by landing on /auth directly. Wraps the same MissionCard
 * AccountView's logged-out state uses, adding scroll-tracking and a
 * compact sticky bar on top. Shown at every breakpoint (unlike
 * HomeInstallBanner, which is mobile-only) — desktop already has Log in /
 * Join the movement in AppSidebar too, but the user wants this banner's
 * presence and stickiness there as well rather than leaving the sidebar as
 * the only desktop surface. No dismiss control — with the landing page
 * gone, this and the sidebar rows are the only discovery surfaces for
 * login/signup, so it stays put on every anonymous visit rather than being
 * closeable.
 */
export default function HomeAuthBanner() {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const { setNode, past: scrolledPast } = useScrolledPast<HTMLDivElement>();

  if (isAuthenticated) return null;

  const goToLogin = () => router.push("/auth/login");
  const goToSignup = () => router.push("/auth/signup");

  return (
    <>
      <MissionCard ref={setNode} className="mb-6" />

      {scrolledPast && (
        <div
          className="fixed inset-x-0 top-0 z-40 flex justify-between box-border border-b border-[var(--reader-border)] bg-[var(--reader-surface)] px-4 py-2.5 text-white shell:left-[var(--app-sidebar-w)]"
          style={{ paddingTop: "max(env(safe-area-inset-top), 0.625rem)" }}
        >
          <div className="flex min-w-0 flex-row items-center gap-3">
            <img
              src="/biko/2.jpg"
              alt="Steve Biko"
              className="h-8 w-8 flex-none rounded-sm object-cover object-top grayscale"
            />
            <span className="min-w-0 truncate font-serif text-[13px] font-semibold text-[var(--reader-text)]">
              &ldquo;The most potent weapon in the hands of the oppressor is the mind of the oppressed.&rdquo;{" "}
              <span className="font-semibold not-italic text-[var(--reader-text-muted)]">— Steve Biko</span>
            </span>
          </div>
          <div className="flex flex-none flex-row items-center gap-2">
            {/* Was border-brand-400/text-brand-400 — a static rust-orange
                that only clears ~3.5:1 against this bar's --reader-surface,
                borderline even at bold/text-xs and the reason "Log in" read
                as barely-there next to the solid "Join us" beside it. A
                filled tint plus the theme-aware --reader-accent (already
                brighter in dark theme, per globals.css) gives it real
                contrast in both themes without going full-solid, which
                would make the two buttons compete for primary billing. */}
            <button
              type="button"
              onClick={goToLogin}
              className="cursor-pointer rounded-sm border border-[var(--reader-border)] bg-white px-3 py-1.5 text-xs font-bold whitespace-nowrap text-brand-400 transition-colors hover:bg-white/95"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={goToSignup}
              className="cursor-pointer rounded-sm border border-brand-500 bg-brand-500 px-3 py-1.5 text-xs font-bold whitespace-nowrap text-white transition-colors hover:bg-brand-600"
            >
              Join us
            </button>
          </div>
        </div>
      )}
    </>
  );
}
