type Theme = "dark" | "light";

/**
 * The sunrise/book brand mark used throughout onboarding. Placeholder until
 * the real artwork lands as SVGs in public/landing/ — this just reserves the
 * same footprint (aspect ratio) the final asset will use, keyed by theme/book
 * so it's a straightforward swap once those files exist.
 */
export default function SunriseMark({
  theme = "dark",
  book = false,
  className,
}: {
  theme?: Theme;
  book?: boolean;
  className?: string;
}) {
  const height = book ? 320 : 280;
  return (
    <div
      className={className}
      style={{ aspectRatio: `400 / ${height}` }}
      data-sunrise-mark={theme}
      aria-hidden="true"
    />
  );
}
