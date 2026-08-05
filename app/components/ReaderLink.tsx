import type { AnchorHTMLAttributes, ReactNode } from "react";

/**
 * A link into /read/[slug] that's guaranteed to land on the real standalone
 * page (app/read/[slug]/page.tsx) — deliberately a plain <a>, not next/link's
 * <Link>. The (.)read/[slug] interception (app/@modal) fires for ANY
 * client-side Link/router navigation to that route, regardless of which
 * page links to it or why — Next has no supported way to opt one Link out.
 * A real <a> is never intercepted (interception only ever applies to soft,
 * client-side transitions), so it's the one thing that reliably bypasses it
 * — same escape hatch AppSidebar/AppBottomNav's own onNavClick reaches for
 * with an explicit window.location.href, just without needing the
 * preventDefault+redirect dance since this never was a Link to begin with.
 *
 * The ONE place the modal overlay is actually meant to trigger is the home
 * community feed's own passage+note permalinks — NoteBookHeader.tsx keeps
 * using next/link's <Link> on purpose, since a "preview without leaving the
 * feed" overlay is the whole point there. Every other link into the reader
 * (continue-reading rail, book-detail page's read/listen/chapter links, the
 * now-playing bar's own title) should use this instead.
 */
export default function ReaderLink({
  href,
  className,
  children,
  ...rest
}: { href: string; className?: string; children?: ReactNode } & Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "className" | "children"
>) {
  return (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  );
}
