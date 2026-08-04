import { create } from "zustand";

/**
 * Real rendered heights of persistent fixed chrome that other fixed
 * elements need to stack above — the same "measure it, store it, offset
 * against it" trick audio-store's playerHeight already does for
 * NowPlayingBar. Pure runtime layout state, not user data, so no persist
 * middleware: it's meaningless before the DOM exists and gets re-measured
 * on every mount anyway.
 */
type LayoutState = {
  /** AppBottomNav's own rendered height (mobile tab bar), in px. */
  bottomNavHeight: number;
  setBottomNavHeight: (px: number) => void;
};

export const useLayoutStore = create<LayoutState>((set) => ({
  bottomNavHeight: 0,
  setBottomNavHeight: (bottomNavHeight) => set({ bottomNavHeight }),
}));
