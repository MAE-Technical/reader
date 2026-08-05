"use client";

import { forwardRef } from "react";
import { useRouter } from "next/navigation";
import AuthButton from "./AuthButton";

/**
 * The recruiting pitch, now pared down to just the CTA — Biko's portrait
 * carries the pitch on its own, so the old headline/copy block (the /auth
 * landing page's original wording) was cut rather than fighting the image
 * for attention. What's left sits directly on the photo, bottom-left: the
 * quote on top, the login/signup buttons under it. A flat tint over the
 * whole photo (not a box around the text) is what keeps both legible —
 * darkening the image itself rather than fencing the content off from it
 * is what makes this still read as one banner instead of a card with a
 * caption stuck on top of it.
 *
 * object-cover, with a centered object-position rather than an edge like
 * "right top": this card's own box swings between two very different
 * shapes — wide and short on desktop (min-height only), tall and narrow on
 * mobile once the buttons stack above the quote. cover always scales to
 * match whichever axis is *tighter* and crops the other — on the wide/short
 * shape that's height-cropping only (width already matches the card
 * exactly, so the horizontal position never even applies there); on the
 * tall/narrow shape it's the reverse, purely horizontal crop. An
 * edge-anchored position is thus guaranteed to crop his face out on
 * whichever breakpoint that axis actually governs — which is exactly what
 * "right top" did (hair-only on desktop, ear-only on mobile). A single
 * roughly-centered position is safe at *both*, since each breakpoint only
 * ever consults one axis of it.
 */
const MissionCard = forwardRef<HTMLDivElement, { className?: string }>(function MissionCard(
  { className = "" },
  ref
) {
  const router = useRouter();

  return (
    <div ref={ref} className={`relative overflow-hidden rounded-sm bg-sand-950 text-white ${className}`}>
      <img
        src="https://idjeqhbhbcqkacyktupb.supabase.co/storage/v1/object/sign/public-cdn/1.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9hYzE0NTA4MS05NjdmLTRiMzctOGRlYy0wMDAyMGYyMjQ2YmMiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJwdWJsaWMtY2RuLzEuanBnIiwic2NvcGUiOiJkb3dubG9hZCIsImlhdCI6MTc4NTk2MTYxNSwiZXhwIjoxODE3NDk3NjE1fQ.nfpRFQZlQ0nuGjC_6XVXYFPoVDbD_j9LRGazC_LntfI"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover object-[48%_30%] grayscale contrast-110 brightness-90"
      />
      {/* Flat tint over the whole photo, plus a bit more weight at the
          bottom where the text sits — darkens the image itself so the
          content reads directly on it, no boxed-off panel needed. */}
      <div className="absolute inset-0 bg-sand-950/35" />
      <div className="absolute inset-0 bg-gradient-to-t from-sand-950/55 from-0% to-transparent to-65%" />

      <div className="relative flex flex-col items-start justify-end gap-4 p-6 pb-8 sm:min-h-96 sm:pb-9">
        <div className="max-w-80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
          <span aria-hidden="true" className="select-none font-literata text-[40px] leading-[0.4] text-white">
            &ldquo;
          </span>
          <blockquote className="m-0 font-serif text-[15px] font-bold leading-snug text-white">
            The most potent weapon in the hands of the oppressor is the mind of the oppressed.
          </blockquote>
          <p className="m-0 mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80">
            Black Consciousness — <span className="text-white">Steve Biko</span>
          </p>
        </div>

        {/* Side by side at every width, each sized to its own label rather
            than stretched to fill a grid column — a stacked, full-width
            pair read as an oversized wall of button on a phone-width card;
            two compact, right-sized buttons sit on the photo the way a
            caption's CTAs would, not a form. */}
        <div className="flex flex-row flex-wrap gap-3">
          <AuthButton variant="outline" fullWidth={false} onClick={() => router.push("/auth/login")}>
            Log in
          </AuthButton>
          <AuthButton variant="solid" fullWidth={false} onClick={() => router.push("/auth/signup")}>
            Join the movement
          </AuthButton>
        </div>
      </div>
    </div>
  );
});

export default MissionCard;
