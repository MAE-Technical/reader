import { create } from "zustand";
import { persist } from "zustand/middleware";

/** Reappear window after the *first* dismiss without installing — long
 * enough that a weekly reader isn't nagged every visit, short enough the
 * CTA still resurfaces rather than being gone for good. */
export const INSTALL_BANNER_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
/** Reappear window after every dismiss *after* the first — someone who's
 * said no more than once has made themselves clearer than someone who's
 * said it once, so they wait longer before being asked again. Never
 * escalates past this (i.e. never goes silent for good): there's no other
 * install surface in the app today, so this banner is the only path to
 * actually installing. Tune freely: cooldown state stores the dismiss
 * timestamp, not an expiry, so neither constant is a migration. */
export const INSTALL_BANNER_LONG_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;

type InstallBannerState = {
  dismissedAt: number | null;
  dismissCount: number;
  /** Set once `useInstallPrompt` ever observes this device running in
   * standalone (installed) mode, and never cleared. `display-mode:
   * standalone` is only true *while actually running installed* — a reader
   * who installed the app but is now looking at a stray browser tab (e.g. a
   * shared link opened outside the installed icon) would otherwise see the
   * install prompt again despite already having it. This is what makes
   * "don't ask again once they've installed" survive across tabs/sessions
   * instead of only within the one that was standalone. */
  hasEverBeenStandalone: boolean;
  hasHydrated: boolean;
  dismiss: () => void;
  markEverInstalled: () => void;
};

export const useInstallBannerStore = create<InstallBannerState>()(
  persist(
    (set) => ({
      dismissedAt: null,
      dismissCount: 0,
      hasEverBeenStandalone: false,
      hasHydrated: false,
      dismiss: () => set((s) => ({ dismissedAt: Date.now(), dismissCount: s.dismissCount + 1 })),
      markEverInstalled: () => set({ hasEverBeenStandalone: true }),
    }),
    {
      name: "ominira-install-banner",
      // Same SSR-hydration-mismatch reasoning as reader-identity-store —
      // rehydrated explicitly by HomeInstallBanner before it trusts this.
      skipHydration: true,
      onRehydrateStorage: () => () => {
        useInstallBannerStore.setState({ hasHydrated: true });
      },
    }
  )
);
