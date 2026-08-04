import { ArrowLeft } from "lucide-react";

export default function BackArrow({ onClick, className = "" }: { onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Back"
      className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-none bg-transparent text-[var(--reader-text)] hover:bg-sand-100 ${className}`}
    >
      <ArrowLeft size={22} />
    </button>
  );
}
