// spec.md's "Read together... see who else is currently reading" now has a
// real data source (public.reader_activities — migrations/20260831_reader_
// activities.sql), superseding the old READING_NOW_PLACEHOLDER constant this
// held. Chat/voice call are still deferred; this is just the "who" list.
//
// How many comrade pseudonyms a book list row's badge personalizes to /
// the book-detail page's roster shows before its own "+N more comrades"
// row — see lib/reader/activity.ts's listCurrentReaders and
// app/components/shared/CurrentReaders.tsx. The roster can expand past this
// in place (up to CURRENT_READERS_DETAIL_CAP) without a second fetch.
export const CURRENT_READERS_DISPLAY_CAP = 5;

// How many pseudonyms a *single* book-detail page looks up — far more
// generous than CURRENT_READERS_DISPLAY_CAP since this cost is per book,
// not per book on a 24-item library page. A book with more concurrent
// readers than this still shows the real totalCount, just with a static
// (non-expandable) remainder past this cap — see CurrentReadersRoster.
export const CURRENT_READERS_DETAIL_CAP = 50;
