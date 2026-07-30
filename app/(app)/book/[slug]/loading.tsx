import Loader from "@/app/components/Loader";

export default function BookDetailLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader label="Loading book…" />
    </div>
  );
}
