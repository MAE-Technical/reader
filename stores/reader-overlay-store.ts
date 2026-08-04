import { create } from "zustand";

/**
 * Whether ReaderModal (app/components/reader/ReaderModal.tsx) is currently
 * mounted — i.e. the reader is open as an overlay on top of some other page,
 * not the standalone /read/[slug] route. Exists purely because usePathname()
 * can't tell the two apart on its own: an intercepted (.)read/[slug]
 * navigation still moves the URL to /read/[slug], so anything that used to
 * infer "no sidebar, this is the reader" from the pathname alone (see
 * NowPlayingBar) got a false positive the moment the overlay shipped — the
 * sidebar-having page underneath is still there, just with pathname now
 * lying about it. Set by ReaderModal's own mount/unmount, read by anything
 * elsewhere in the root layout that needs to know.
 */
type ReaderOverlayState = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const useReaderOverlayStore = create<ReaderOverlayState>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
