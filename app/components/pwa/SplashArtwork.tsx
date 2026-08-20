"use client";

import Image from "next/image";
import { useReaderStore } from "@/stores/reader-store";

/**
 * The two non-text illustration exports from the launch-screen Figma frames.
 * Keeping the selection here means the login panel and the PWA launch screen
 * cannot drift onto different light/dark artwork.
 */
export default function SplashArtwork({
  className = "",
  showAccent = true,
}: {
  className?: string;
  showAccent?: boolean;
}) {
  const theme = useReaderStore((state) => state.theme);
  const assetTheme = theme === "dark" ? "dark" : "light";

  return (
    <div className={`relative w-full max-w-[340px] ${className}`} aria-hidden="true">
      {showAccent && (
        <Image
          src={`/images/splash/${assetTheme}-accent.svg`}
          alt=""
          width={53}
          height={55}
          unoptimized
          className="absolute -top-5 right-0 h-[55px] w-[53px]"
        />
      )}
      <Image
        src={`/images/splash/${assetTheme}-illustration.svg`}
        alt=""
        width={340}
        height={347}
        unoptimized
        className="block h-auto w-full"
      />
    </div>
  );
}
