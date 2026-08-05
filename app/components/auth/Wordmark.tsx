import { PLATFORM_NAME } from "@/lib/config/platform";

export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-serif text-sm font-bold tracking-[0.22em] text-brand-500 uppercase ${className}`}>
      {PLATFORM_NAME}
    </span>
  );
}
