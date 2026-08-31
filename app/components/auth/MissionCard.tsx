"use client";

import { forwardRef } from "react";
import { useRouter } from "next/navigation";
import AuthButton from "./AuthButton";

/**
 * Substack-style recruiting card: a plain bordered surface (not a dark photo
 * banner) with the pitch — title, subheading, CTAs — on the left and a
 * portrait + quote as the "illustration" on the right, the way Substack's
 * own house-ad card pairs a headline/CTA block with a decorative graphic in
 * the corner. Biko's photo is a thumbnail here rather than the full card
 * background, so it can sit beside the quote instead of behind it.
 *
 * Rather than a flat fill, the surface is a faint diagonal wash — the same
 * surface token warmed by a sliver of brand rust via color-mix, so the
 * banner reads as a banner instead of a form panel, without needing a
 * pattern overlay or a separate dark-mode variant (color-mix always starts
 * from --reader-surface, so it tracks whichever theme is active).
 */
const MissionCard = forwardRef<HTMLDivElement, { className?: string }>(function MissionCard(
  { className = "" },
  ref
) {
  const router = useRouter();

  return (
    <div
      ref={ref}
      className={`mb-15 relative overflow-hidden rounded-sm border border-[var(--reader-border)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--reader-surface)_90%,var(--color-brand-500)_10%),var(--reader-surface)_65%)] p-7 sm:p-9 ${className}`}
    >
      <div className="relative flex flex-col items-start gap-7 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col items-start gap-4">
          <div className="flex flex-col items-start gap-2">
            <h2 className="m-0 max-w-xs font-serif text-2xl font-bold leading-tight text-[var(--reader-text)] sm:text-[28px]">
              We are studying to change our world.
            </h2>
            {/* <p className="m-0 max-w-xs font-literata text-[13px] leading-snug text-[var(--reader-text-muted)] sm:text-sm">
              Free books, honest conversations, and a reading culture built by and for young Nigerians.
            </p> */}
          </div>

          {/* Side by side at every width, each sized to its own label rather
              than stretched full-width — two compact buttons read as a
              caption's CTAs, not a form. */}
          <div className="flex flex-row flex-wrap gap-3">
            <AuthButton variant="solid" fullWidth={false} onClick={() => router.push("/auth/signup")}>
              Join the movement
            </AuthButton>
            <AuthButton variant="outline" fullWidth={false} onClick={() => router.push("/auth/login")}>
              Log in
            </AuthButton>
          </div>
        </div>

        {/* The "illustration" corner: a portrait next to the quote it
            belongs to, wide enough for the line to breathe instead of
            wrapping into a narrow column. */}
        <div className="flex flex-none flex-row items-center gap-4 sm:max-w-80">
          <img
            src="https://idjeqhbhbcqkacyktupb.supabase.co/storage/v1/object/sign/public-cdn/1.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hYzE0NTA4MS05NjdmLTRiMzctOGRlYy0wMDAyMGYyMjQ2YmMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwdWJsaWMtY2RuLzEuanBnIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4NTk2MTYxNSwiZXhwIjoxODE3NDk3NjE1fQ.nfpRFQZlQ0nuGjC_6XVXYFPoVDbD_j9LRGazC_LntfI"
            alt="Steve Biko"
            className="h-20 w-20 flex-none rounded-sm object-cover object-[48%_20%] grayscale contrast-110 sm:h-24 sm:w-24"
          />
          <div>
            <blockquote className="m-0 font-serif text-sm font-semibold italic leading-snug text-[var(--reader-text)]">
              &ldquo;The most potent weapon in the hands of the oppressor is the mind of the oppressed.&rdquo;
            </blockquote>
            <p className="m-0 mt-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--reader-text-muted)]">
              Steve Biko
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

export default MissionCard;
