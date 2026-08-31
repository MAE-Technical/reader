"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { useSessionStore } from "@/stores/session-store";
import type { CommunityFeedItem } from "@/lib/community/useCommunityFeed";
import type { MaterialSummary } from "@/lib/api/types";

export type ReaderProfileStats = { notes: number; reading: number; reactions: number };

export type ReaderProfileCurrentlyReading = {
  material: Pick<
    MaterialSummary,
    | "id" | "slug" | "title" | "author" | "cover" | "thumbnail"
    | "googleCoverUrl" | "googleThumbnailUrl" | "openlibraryCoverUrl" | "openlibraryThumbnailUrl" | "coverSource"
  >;
  /** Only populated for `isSelf` — see lib/reader/profile.ts's own doc
   * comment on why a visitor never gets someone else's exact progress. */
  progressPercent: number | null;
};

export type ReaderProfileHighlight = {
  id: string;
  material: Pick<MaterialSummary, "id" | "slug" | "title" | "author">;
  excerpt: string;
  createdAt: string;
};

/**
 * Mirrors lib/reader/profile.ts's `ReaderProfilePage` — a hand-kept client
 * copy rather than an import, same "server-only lib file, client hook
 * defines its own mirrored shape" split useCommunityFeed's own
 * CommunityFeedItem already follows (that file's own doc comment). Reusing
 * `CommunityFeedItem` itself for `publicNotes` below (rather than yet a
 * third identical shape) is exactly why this profile bundle and the home
 * feed can share one card component — see ReaderProfileView.
 */
export type ReaderProfilePage = {
  reader: { id: string; pseudonym: string; city: string | null; country: string | null; joinedAt: string };
  isSelf: boolean;
  stats: ReaderProfileStats;
  currentlyReading: ReaderProfileCurrentlyReading[];
  publicNotes: CommunityFeedItem[];
  highlights: ReaderProfileHighlight[] | null;
};

/** `GET /api/readers/{slug}`. Public — works signed out — but its response
 * shape depends on who's asking (`isSelf`/`highlights`), so the viewer's
 * own readerId is folded into the query key: logging in as the profile's
 * own owner in one tab (or switching accounts) while this is already
 * cached gets its own cache entry rather than silently reusing a stale
 * public-view one. Gated on session-store's own hydration (`hasHydrated`,
 * see useIsAuthenticated's doc comment) so the first real fetch already
 * knows the true viewer instead of firing once anonymously and refetching
 * a moment later. */
export function useReaderProfile(slug: string) {
  const hasHydrated = useSessionStore((s) => s.hasHydrated);
  const readerId = useSessionStore((s) => s.readerId);

  return useQuery({
    queryKey: ["readers", slug, readerId ?? "anon"] as const,
    queryFn: () => apiFetch<ReaderProfilePage>(`/readers/${slug}`),
    enabled: Boolean(slug) && hasHydrated,
  });
}
