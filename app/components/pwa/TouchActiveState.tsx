"use client";

import { useEffect } from "react";

/**
 * iOS Safari's own long-standing quirk: the `:active` CSS pseudo-class
 * never applies on tap anywhere in the document unless *something* has a
 * `touchstart` listener bound — with none anywhere in the app, every
 * `active:` Tailwind variant (nav links, buttons) was silently inert on
 * iOS, on top of `-webkit-tap-highlight-color: transparent` (globals.css)
 * already suppressing the native gray-flash feedback that would otherwise
 * have stood in for it. Together those two made a tap register with *no*
 * visual acknowledgment at all until whatever it triggered actually
 * finished — read as "the tap didn't take" even when it had.
 *
 * A single no-op, passive, body-level listener is the standard fix — its
 * mere presence is what turns `:active` handling on globally; it doesn't
 * need to do anything itself. Mounted once at the root layout, same
 * pattern as ServiceWorkerRegistration.
 */
export default function TouchActiveState() {
  useEffect(() => {
    const noop = () => {};
    document.body.addEventListener("touchstart", noop, { passive: true });
    return () => document.body.removeEventListener("touchstart", noop);
  }, []);

  return null;
}
