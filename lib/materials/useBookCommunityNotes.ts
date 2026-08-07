"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { materialKeys } from "@/lib/materials/queryKeys";
import type { CommunityFeedSort } from "@/lib/community/useCommunityFeed";
import type { Note } from "@/lib/api/types";

export type BookNoteFeedItem = {
  note: Note;
  replies: Note[];
  excerpt: string;
  sectionId: string;
  label: string;
};

/** `GET /api/materials/{materialId}/notes?withExcerpts=true` — the book
 * details page's own community-notes tab: every top-level, visible-to-me
 * note on this specific book, each with its full reply thread and quoted
 * excerpt already attached (same "no threshold, ship it all up front" shape
 * as the home feed — see lib/community/feed.ts), sorted the same
 * top/recent way that feed's own PillGroup toggle offers. A different
 * fetch from useMaterialNotes (the reader's own inline-markers source,
 * unsorted/un-excerpted, flattened) rather than a variant of it — this one
 * exists to render as a feed of cards, that one to group by passage. */
export function useBookCommunityNotes(materialId: string, sort: CommunityFeedSort) {
  return useQuery({
    queryKey: materialKeys.notesFeed(materialId, sort),
    queryFn: () =>
      apiFetch<{ items: BookNoteFeedItem[]; nextCursor: string | null }>(
        `/materials/${materialId}/notes?sort=${sort}&limit=20&withExcerpts=true`
      ),
    enabled: Boolean(materialId),
  });
}
