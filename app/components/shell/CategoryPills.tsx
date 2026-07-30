// Manually seeded for now — BookMetadata has no category/genre field yet, so
// "All" is the only pill any book currently matches. The rest exist so the
// filter row looks and behaves right ahead of real category data existing.
export const DEFAULT_CATEGORIES = ["All", "Pan-Africanism", "Marxism", "Feminism", "Decolonial", "Politics"];

type Props = {
  selected: string;
  onSelect: (category: string) => void;
};

export default function CategoryPills({ selected, onSelect }: Props) {
  return (
    <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 no-callout min-[860px]:mx-0 min-[860px]:px-0">
      {DEFAULT_CATEGORIES.map((category) => {
        const active = category === selected;
        return (
          <button
            key={category}
            onClick={() => onSelect(category)}
            className={`flex-none whitespace-nowrap rounded-sm border px-4 py-2 text-xs font-bold cursor-pointer overflow-hidden transition-colors ${
              active
                ? "border-brand-500 bg-brand-500 text-white"
                : "border-[var(--reader-border)] bg-[var(--reader-surface)] text-[var(--reader-text-muted)] hover:bg-[var(--reader-surface-hover)]"
            }`}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}
