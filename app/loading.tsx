import Loader from "@/app/components/Loader";

// Root-level Suspense fallback — applies to any route segment that doesn't
// define its own loading.tsx (app/read/[slug] and book/[slug] do, though
// all three just render the same bare <Loader/> now — it positions itself).
export default function RootLoading() {
  return <Loader />;
}
