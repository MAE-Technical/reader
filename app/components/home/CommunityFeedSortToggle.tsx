"use client";

import type { CommunityFeedSort } from "@/lib/community/useCommunityFeed";
import PillGroup from "../PillGroup";

const OPTIONS: { value: CommunityFeedSort; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "recent", label: "Recent" },
];

export default function CommunityFeedSortToggle({
  mode,
  onChange,
}: {
  mode: CommunityFeedSort;
  onChange: (mode: CommunityFeedSort) => void;
}) {
  return <PillGroup options={OPTIONS} selected={mode} onSelect={onChange} />;
}
