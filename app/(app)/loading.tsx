import Loader from "@/app/components/Loader";

// Shared fallback for every page under the (app) group (home/library/
// account/notes) that doesn't define its own more specific loading.tsx —
// same unconfined <Loader/> as the root's own app/loading.tsx and
// book/[slug]'s (see Loader's own doc comment on why it defaults to a
// fixed, viewport-wide dim rather than a small box inside AppShell's
// content column). What this buys is the actual point of loading.tsx: the
// URL/active-tab state (AppBottomNav's usePathname()) updates and the
// transition starts the instant a tab is tapped, with this shown on top
// while the destination's own data resolves — rather than nothing visibly
// happening at all until that data is fully ready. Without a loading.tsx
// anywhere on this branch, a tab tap on a page doing real async work
// (home/library both read every book off disk) left the *previous* page
// fully in place until the new one was completely ready to swap in
// wholesale, which is what read as the nav "hanging."
export default function AppGroupLoading() {
  return <Loader />;
}
