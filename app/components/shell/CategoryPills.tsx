import PillGroup from "../PillGroup";

const ALL_CATEGORY = "All";

type Props = {
  categories: string[];
  selected: string;
  onSelect: (category: string) => void;
};

export default function CategoryPills({ categories, selected, onSelect }: Props) {
  return (
    <PillGroup
      options={[ALL_CATEGORY, ...categories].map((category) => ({ value: category, label: category }))}
      selected={selected}
      onSelect={onSelect}
      scroll
    />
  );
}
