import type { ReactNode } from "react";

/**
 * Onboarding screens live outside app/(app) — no sidebar/bottom nav, no
 * NowPlayingBar-reserved padding. Each page owns its own background (dark
 * hero vs. cream form) rather than this layout picking one.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
