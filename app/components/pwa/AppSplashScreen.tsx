"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { PLATFORM_NAME } from "@/lib/config/platform";
import { useReaderStore } from "@/stores/reader-store";

const SPLASH_DURATION_MS = 1500;

// Theme controls the visual treatment only. Add future splash quotations here
// without changing the layout or binding a quotation to a color scheme.
const SPLASH_QUOTES = [
  {
    text: "Imperialism is a system of exploitation that occurs not only in the brutal form of those who come with guns to conquer territory... We are fighting this system that allows a handful of men on Earth to rule all of humanity.",
    attribution: "— Thomas Sankara",
  },
  {
    text: "The decolonization of the mind is necessary as the decolonization of the land.",
    attribution: "— Frantz Fanon",
  },
] as const;

/**
 * The web-app launch screen shown while the React app becomes interactive.
 * It is mounted once in the root layout, so normal client-side navigation
 * never retriggers it. The manifest background remains the native first
 * paint; this supplies the branded, theme-aware screen immediately after.
 */
export default function AppSplashScreen() {
  const [visible, setVisible] = useState(true);
  // A stable initial value avoids an SSR/client hydration mismatch. The
  // animation-frame callback then selects a fresh quote for each app launch.
  const [quoteIndex, setQuoteIndex] = useState(0);
  const theme = useReaderStore((state) => state.theme);
  const assetTheme = theme === "dark" ? "dark" : "light";

  useEffect(() => {
    const timeout = window.setTimeout(() => setVisible(false), SPLASH_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setQuoteIndex(Math.floor(Math.random() * SPLASH_QUOTES.length));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!visible) return null;

  const dark = theme === "dark";
  const quote = SPLASH_QUOTES[quoteIndex];

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center overflow-hidden transition-opacity duration-200"
      style={{ background: dark ? "#1d1c1b" : "#ffffff" }}
      aria-label={`${PLATFORM_NAME} is loading`}
      role="status"
    >
      <div className="flex min-h-[100svh] w-full max-w-[440px] flex-col px-6 py-12 shell:px-8 shell:py-16">
        <header className="grid w-full max-w-[340px] grid-cols-[53px_1fr_53px] self-center items-center">
          <span aria-hidden="true" />
          <p className="text-center font-serif text-3xl font-semibold tracking-[0.08em] text-[#b74f34] uppercase shell:text-4xl">
            {PLATFORM_NAME}
          </p>
          <Image
            src={`/images/splash/${assetTheme}-accent.svg`}
            alt=""
            width={53}
            height={55}
            unoptimized
            priority
            className="h-[55px] w-[53px] justify-self-end"
          />
        </header>
        <div className="mt-[clamp(4rem,12svh,7rem)] w-full max-w-[400px] self-center text-center font-serif text-lg leading-[1.28] text-[#b74f34] shell:text-2xl">
          <p>{quote.text}</p>
          <p className="mt-5">{quote.attribution}</p>
        </div>
        <Image
          src={`/images/splash/${assetTheme}-illustration.svg`}
          alt=""
          width={340}
          height={347}
          unoptimized
          priority
          className="mt-auto w-full max-w-[400px] self-center"
        />
      </div>
    </div>
  );
}
