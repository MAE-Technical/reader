"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { communityKeys } from "@/lib/community/queryKeys";
import type { MaterialSummary, Note } from "@/lib/api/types";

export type CommunityFeedItem = {
  note: Note;
  material: Pick<MaterialSummary, "id" | "slug" | "title" | "author" | "cover">;
  sectionId: string;
  label: string;
  /** The actual quoted passage text, resolved server-side — replaces the
   * old DUMMY_EXCERPT_PLACEHOLDER stand-in now that this feed reads from
   * the real API. */
  excerpt: string;
  /** Every visible reply, hydrated and chronological — shipped inline so a
   * card's reply count and thread are accurate immediately, no click or
   * separate fetch required. */
  replies: Note[];
};

/** The two sorts CommunityFeedSortToggle's UI exposes — `GET
 * /api/community/notes` also supports `trending`, not wired to any control
 * yet (out of scope for this pass, same as it was before this feed had a
 * real backend at all). */
export type CommunityFeedSort = "recent" | "top";

/** `GET /api/community/notes` — the home community feed. Only top-level,
 * public notes (api-spec.md) — this is the discovery surface, not a
 * per-book thread view. */
export function useCommunityFeed(sort: CommunityFeedSort) {
  return useQuery({
    queryKey: communityKeys.feed(sort),
    queryFn: () =>
      apiFetch<{ items: CommunityFeedItem[]; nextCursor: string | null }>(`/community/notes?sort=${sort}&limit=20`),
  });
}
