import { Share } from "lucide-react";
import type { InstallPlatform } from "@/lib/pwa/useInstallPrompt";

export const IOS_INSTALL_STEPS = [
  "Tap the Share icon in Safari's toolbar.",
  "Scroll down and tap “Add to Home Screen.”",
  "Tap “Add.”",
];

export const OTHER_INSTALL_STEPS = [
  "Open your browser's menu.",
  "Look for “Add to Home screen” or “Install app.”",
  "Confirm — Ominira will appear as an icon like any other app.",
];

/**
 * Numbered manual-install steps for when no native `beforeinstallprompt` is
 * available — HomeInstallBanner's expanded state only (AccountView's own
 * install card uses a terser one-line explanation per surface instead, per
 * the Claude Design brief). A fixed light presentation, not reader-theme
 * reactive — matches HomeInstallBanner's own always-light card.
 *
 * `requiresSafariRedirect` covers the one iOS gap that actually trips
 * people up: Chrome/Firefox/Edge/Opera on iOS are all still WebKit, but
 * "Add to Home Screen" only exists in Safari's own UI — the numbered steps
 * are simply wrong (missing menu item) in any other iOS browser, so that
 * case gets its own message instead of steps that don't apply.
 */
export default function InstallSteps({
  platform,
  requiresSafariRedirect,
}: {
  platform: InstallPlatform;
  requiresSafariRedirect: boolean;
}) {
  if (platform === "ios" && requiresSafariRedirect) {
    return (
      <p className="m-0 text-sm font-normal leading-relaxed text-sand-600">
        On iPhone and iPad, installing only works from Safari itself — open this page there
        (tap your browser&apos;s menu and choose &ldquo;Open in Safari&rdquo;), then come back to
        &ldquo;How to install.&rdquo;
      </p>
    );
  }

  const steps = platform === "ios" ? IOS_INSTALL_STEPS : OTHER_INSTALL_STEPS;
  return (
    <ol className="m-0 flex flex-col gap-3.5 pl-0">
      {steps.map((step, i) => (
        <li key={step} className="flex items-start gap-3">
          <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full bg-brand-50 text-[11px] font-semibold text-brand-500">
            {platform === "ios" && i === 0 ? <Share size={12} /> : i + 1}
          </span>
          <span className="flex-1 text-sm font-normal leading-relaxed text-sand-950">{step}</span>
        </li>
      ))}
    </ol>
  );
}
