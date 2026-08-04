import PillGroup from "../PillGroup";

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
    <PillGroup
      options={DEFAULT_CATEGORIES.map((category) => ({ value: category, label: category }))}
      selected={selected}
      onSelect={onSelect}
      scroll
    />
  );
}
