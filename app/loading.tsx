import Loader from "@/app/components/Loader";

// Root-level Suspense fallback — applies to any route segment that doesn't
// define its own loading.tsx (app/read/[slug] does, with a book-specific
// label; everything else falls through to this generic one).
export default function RootLoading() {
  return (
    <div className="w-full h-screen">
      <Loader />
    </div>
  );
}
