import { PLATFORM_NAME } from "@/lib/config/platform";

export default function Wordmark() {
  return (
    <span className={`font-serif text-sm font-bold tracking-[0.22em] text-brand-500 uppercase`}>
      {PLATFORM_NAME}
    </span>
  );
}
