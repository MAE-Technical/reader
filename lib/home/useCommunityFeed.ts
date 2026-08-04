import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useLibraryStore } from "@/stores/library-store";
import { buildCommunityFeedItems, sortCommunityFeedItems, type CommunityFeedSortMode } from "./communityFeed";
import type { CommunityBookMeta } from "./communityBook";

/**
 * The home community feed's own reactive state — every top-level note
 * across every book the local reader has actually annotated, sorted.
 *
 * `getAllForBook` allocates a fresh array on every call (see its own doc
 * comment on `stores/library-store.ts`), so it's never called as a direct
 * selector — instead this subscribes to each qualifying book's reference-
 * stable `annotationsByPassage` via `useShallow`, so a re-render only
 * happens on a real annotation mutation (or the qualifying-book set
 * changing), never on `setPosition`, which fires on every scroll tick in
 * every open book. The qualifying filter itself — `notes.byId` actually
 * has entries — matters because `setPosition` alone already creates a
 * `BookState` entry just from opening a book, so a plain `Object.keys`
 * over the whole store would overcount "books this reader has annotated".
 */
export function useCommunityFeed(booksMeta: CommunityBookMeta[]) {
  const getAllForBook = useLibraryStore((s) => s.getAllForBook);
  const annotationsByBook = useLibraryStore(
    useShallow((s) =>
      Object.fromEntries(
        Object.entries(s.books)
          .filter(([, book]) => Object.keys(book.notes.byId).length > 0)
          .map(([bookId, book]) => [bookId, book.annotationsByPassage])
      )
    )
  );

  const booksMetaById = useMemo(() => Object.fromEntries(booksMeta.map((m) => [m.id, m])), [booksMeta]);

  const [sort, setSort] = useState<CommunityFeedSortMode>("recent");

  const items = useMemo(() => {
    const flat = Object.fromEntries(Object.keys(annotationsByBook).map((id) => [id, getAllForBook(id)]));
    return sortCommunityFeedItems(buildCommunityFeedItems(flat, booksMetaById), sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getAllForBook intentionally omitted, same as useBookAnnotationFeed: annotationsByBook is the real dependency, getAllForBook reads the freshest state itself when called.
  }, [annotationsByBook, booksMetaById, sort]);

  return { items, sort, setSort };
}
