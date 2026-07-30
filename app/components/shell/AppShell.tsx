import type { ReactNode } from "react";
import AppSidebar from "./AppSidebar";
import AppBottomNav from "./AppBottomNav";

/**
 * Shared chrome for every page under app/(app) — reserves space for the
 * desktop sidebar and mobile bottom nav once here rather than in every page.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--reader-bg)" }}>
      <AppSidebar />

      <div
        className="min-[860px]:pl-[var(--app-sidebar-w)] pb-20 min-[860px]:pb-0"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <main className="mx-auto max-w-5xl px-5 py-2 min-[860px]:px-10">{children}</main>
      </div>

      <AppBottomNav />
    </div>
  );
}
