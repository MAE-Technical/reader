import { onlineManager } from "@tanstack/react-query";

// How long the browser's online/offline signal has to hold steady before
// TanStack Query is told about it. Real mobile hardware at the edge of
// signal (elevators, subway, a weak wifi handoff — the PWA's actual offline
// case, not a lab toggle) doesn't report one clean transition; `online`/
// `offline` fire in a rapid burst as the connection flaps. Every query in
// the app inherits TanStack's default `networkMode: 'online'`, which pauses
// on `offline` and immediately refetches on `online` — undebounced, that
// burst becomes a burst of pause/resume/pause/resume, and every loading
// skeleton gated on a query still in its initial load blinks in lockstep
// with it. This coalesces the burst into the one transition that actually
// matters: whatever the signal has settled on after it stops flapping.
const SETTLE_MS = 1500;

let configured = false;

/**
 * Swaps TanStack Query's default (immediate, undebounced) online/offline
 * listener for a debounced one. Idempotent and safe to call more than once
 * (e.g. React StrictMode's double-invoke) — only the first call actually
 * installs it. Must run client-side only; QueryProvider calls this from a
 * `useEffect`, never at module scope, so it never runs during the server
 * render pass of that "use client" component.
 */
export function configureDebouncedOnlineManager() {
  if (configured) return;
  configured = true;

  onlineManager.setEventListener((setOnline) => {
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleReport = () => {
      if (settleTimer) clearTimeout(settleTimer);
      // Read navigator.onLine at fire time, not from the event — a fast
      // online/offline/online flap should report the same "online" that's
      // still true by the time the timer fires, not whatever the first
      // event in the burst happened to be.
      settleTimer = setTimeout(() => setOnline(navigator.onLine), SETTLE_MS);
    };
    window.addEventListener("online", scheduleReport);
    window.addEventListener("offline", scheduleReport);
    return () => {
      if (settleTimer) clearTimeout(settleTimer);
      window.removeEventListener("online", scheduleReport);
      window.removeEventListener("offline", scheduleReport);
    };
  });
}
