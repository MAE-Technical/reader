// App-wide loading indicator — no hooks of its own, safe to render from a
// Server Component (a route's loading.tsx) or a client one (Reader.tsx's
// hydration gate) alike. Paints its own full-bleed background so call sites
// don't each need to repeat one. Uses the --reader-* theme tokens (light/
// dark, see app/globals.css) rather than fixed colors, so it always matches
// the reader's own set theme — ThemeProvider (mounted once in app/layout.tsx)
// is what puts every page inside a data-reader-theme scope, not just the
// reader itself.
export default function Loader({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-3 select-none no-callout"
      style={{ background: "var(--reader-bg)" }}
    >
      <div
        aria-hidden
        className="loader-spin w-8 h-8 rounded-full"
        style={{
          border: "2.5px solid var(--reader-border)",
          borderTopColor: "var(--color-brand-500)",
        }}
      />
      <p className="text-sm" style={{ color: "var(--reader-text-muted)" }}>
        {label}
      </p>
    </div>
  );
}
