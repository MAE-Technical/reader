import Loader from "@/app/components/Loader";

export default function ReadBookLoading() {
  return (
    <div className="w-full h-screen">
      <Loader label="Loading book…" />
    </div>
  );
}
