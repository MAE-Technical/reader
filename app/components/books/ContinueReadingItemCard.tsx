import ReaderLink from "@/app/components/ReaderLink";
import type { ContinueReadingItem } from "@/lib/auth/useContinueReading";

type Props = {
  item: ContinueReadingItem;
  variant: "rail" | "sidebar" | "page";
};

export default function ContinueReadingItemCard({ item, variant }: Props) {
  const { material, progressPercent } = item;
  const isSidebar = variant === "sidebar";
  const isRailStyle = variant === "rail" || variant === "page";

  return (
    <ReaderLink
      href={`/read/${material.slug}`}
      className={
        isRailStyle
          ? `flex gap-3 rounded-sm border border-[var(--reader-border)] bg-[var(--reader-surface)] p-3 no-underline ${
              variant === "rail" ? "w-60 flex-none md:w-70" : "w-full"
            }`
          : isSidebar
            ? "flex gap-2.5 rounded-sm p-2 no-underline hover:bg-[var(--reader-surface-hover)]"
            : "flex gap-3 rounded-sm border border-[var(--reader-border)] bg-[var(--reader-surface)] p-3 no-underline"
      }
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={material.cover ?? ""}
        alt={material.title}
        className={
          isRailStyle
            ? "h-20 w-17 flex-none rounded-sm border border-[var(--reader-border)] object-cover"
            : isSidebar
              ? "h-14 w-10 flex-none rounded-sm border border-[var(--reader-border)] object-cover"
              : ""
        }
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="min-w-0">
          <div className="truncate font-serif text-sm font-semibold leading-tight text-[var(--reader-text)]">{material.title}</div>
          <div className="mt-0.5 truncate text-xs font-medium text-[var(--reader-text-muted)]">{material.author}</div>
        </div>
        <div className="mt-auto flex flex-col gap-1.5">
          <div className="h-1 overflow-hidden rounded-full bg-[var(--reader-surface-hover)]">
            <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.round(progressPercent)}%` }} />
          </div>
          <div className="text-[11px] font-medium text-[var(--reader-text-muted)]">{Math.round(progressPercent)}% complete</div>
        </div>
      </div>
    </ReaderLink>
  );
}
