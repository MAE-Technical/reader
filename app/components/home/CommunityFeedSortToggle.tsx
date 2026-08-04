"use client";

import type { CommunityFeedSortMode } from "@/lib/home/communityFeed";
import PillGroup from "../PillGroup";

const OPTIONS: { value: CommunityFeedSortMode; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "recent", label: "Recent" },
];

export default function CommunityFeedSortToggle({
  mode,
  onChange,
}: {
  mode: CommunityFeedSortMode;
  onChange: (mode: CommunityFeedSortMode) => void;
}) {
  return <PillGroup options={OPTIONS} selected={mode} onSelect={onChange} />;
}
