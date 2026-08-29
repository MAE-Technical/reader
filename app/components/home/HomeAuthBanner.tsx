"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useIsAuthenticated } from "@/lib/auth/useIsAuthenticated";
import { useScrolledPast } from "@/lib/dom/useScrolledPast";
import MissionCard from "@/app/components/auth/MissionCard";
import BrandMark from "@/app/components/shell/BrandMark";

/**
 * The old dedicated /auth landing page's job — recruiting an anonymous
 * reader into an account — folded into the home feed instead of a page you
 * only ever see by landing on /auth directly. Wraps the same MissionCard
 * AccountView's logged-out state uses, adding scroll-tracking and a
 * compact sticky bar on top. Shown at every breakpoint (unlike
 * HomeInstallBanner, which is mobile-only) — desktop already has Log in /
 * Join the movement in AppSidebar too, but the user wants this banner's
 * presence and stickiness there as well rather than leaving the sidebar as
 * the only desktop surface. The compact state carries the product mark and
 * actions, not a second editorial message. No dismiss control — with the
 * landing page gone, this and the sidebar rows are the only discovery surfaces for
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

      {/* {scrolledPast && (
        <div
          className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 box-border border-b border-[var(--reader-border)] bg-[var(--reader-bg)] px-4 py-2.5 shell:px-4"
          style={{ paddingTop: "max(env(safe-area-inset-top), 0.625rem)" }}
        >
          <Link href="/home" aria-label="Ominira home" className="flex-none no-underline">
            <BrandMark />
          </Link>
          <div className="flex flex-none flex-row items-center gap-2">
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
      )} */}
    </>
  );
}
