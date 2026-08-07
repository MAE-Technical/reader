import { useCallback, useMemo, useRef, useState } from "react";
import { apiFetch } from "@/lib/api/client";
import type { Section } from "@/lib/book/schema";

/** Walks a (possibly nested) section, collecting its own id plus every
 * descendant's — used to mark a whole fetched subtree "has real text now"
 * in one pass, since a parent section's own per-section fetch (below)
 * comes back with its children's real content already inlined too. */
function collectIds(section: Section, into: Set<string>) {
  into.add(section.id);
  for (const child of section.children) collectIds(child, into);
}

/** Swaps in `replacement` wherever its id is found in the tree, at any
 * depth — the one mutation every fetch below needs (a section arriving
 * with its real prose now that it didn't have before). Everything outside
 * the matched node's own path keeps its existing object identity, so a
 * memo keyed on an unrelated sibling section never invalidates. */
function replaceSectionById(sections: Section[], replacement: Section): Section[] {
  let changed = false;
  const next = sections.map((s) => {
    if (s.id === replacement.id) {
      changed = true;
      return replacement;
    }
    if (s.children.length > 0) {
      const children = replaceSectionById(s.children, replacement);
      if (children !== s.children) {
        changed = true;
        return { ...s, children };
      }
    }
    return s;
  });
  return changed ? next : sections;
}

/**
 * Fills in a book's real prose progressively, on top of whatever the server
 * already sent (see toBookDocument.ts's own doc comment: every section's
 * structure is always real from the start, only `passage.text` on
 * non-eager sections starts blank). Three things happen here:
 *
 *  - `ensureTextLoaded(sectionId)` — ships that one section's real content
 *    via the existing per-section endpoint
 *    (`GET /api/materials/{id}?fields=sections&sectionId=`, unchanged,
 *    already used by the book-detail page's chapter links). Cheap, and a
 *    no-op if already loaded or already in flight.
 *  - `loadAllTextInBackground()` — the "rest of the book, at once" wave:
 *    one call to the same whole-book endpoint the old blocking load always
 *    used (`fullContent=true`), fired once, after the reader can already
 *    see their own starting section. A book with no unloaded sections left
 *    (a short book the server's own single eager section already covered
 *    entirely) still safely no-ops here — merging in content that's
 *    already real changes nothing. Its own response is always the complete,
 *    real tree regardless of whatever `ensureTextLoaded` calls may also be
 *    in flight for individual sections — both read the same immutable book
 *    content, so there's nothing to reconcile between them.
 *  - `isTextLoaded(sectionId)` — for callers that want to know before
 *    deciding whether to await `ensureTextLoaded` at all.
 *
 * `sections` is the live, ever-more-complete tree — every existing reader
 * consumer (orderedSections, passageLookup, search, the book-wide notes
 * feed) reads off this instead of the original static prop, so they all
 * improve automatically as more of the book arrives, with no separate
 * "is this stale" bookkeeping of their own.
 */
export function useProgressiveText({
  materialId,
  initialSections,
  eagerSectionIds,
}: {
  materialId: string;
  initialSections: Section[];
  eagerSectionIds: string[];
}) {
  const [sections, setSections] = useState(initialSections);
  const loadedIdsRef = useRef(new Set(eagerSectionIds));
  const inFlightRef = useRef(new Map<string, Promise<void>>());
  const backgroundPromiseRef = useRef<Promise<Section[]> | null>(null);

  const isTextLoaded = useCallback((sectionId: string) => loadedIdsRef.current.has(sectionId), []);

  const ensureTextLoaded = useCallback(
    (sectionId: string): Promise<void> => {
      if (loadedIdsRef.current.has(sectionId)) return Promise.resolve();
      const existing = inFlightRef.current.get(sectionId);
      if (existing) return existing;

      const promise = apiFetch<{ sections: Section }>(
        `/materials/${materialId}?fields=sections&sectionId=${encodeURIComponent(sectionId)}`
      )
        .then((data) => {
          setSections((prev) => replaceSectionById(prev, data.sections));
          collectIds(data.sections, loadedIdsRef.current);
        })
        .catch(() => {
          // Best-effort — this section just stays blank until a retry (the
          // next mount, or another ensureTextLoaded call for it) succeeds;
          // never worth blocking the reader over a dropped request.
        })
        .finally(() => {
          inFlightRef.current.delete(sectionId);
        });
      inFlightRef.current.set(sectionId, promise);
      return promise;
    },
    [materialId]
  );

  // Fired exactly once per Reader mount, right after the reader's own
  // starting section is confirmed ready — every remaining section's real
  // prose, in one request, same endpoint the whole reader always used to
  // block on.
  const loadAllTextInBackground = useCallback((): Promise<Section[]> => {
    if (!backgroundPromiseRef.current) {
      backgroundPromiseRef.current = apiFetch<{ sections: Section[] }>(
        `/materials/${materialId}?fields=sections&fullContent=true`
      )
        .then((data) => {
          setSections(data.sections);
          for (const s of data.sections) collectIds(s, loadedIdsRef.current);
          return data.sections;
        })
        .catch(() => {
          // Sections simply stay whatever they already were — each one
          // remains individually fetchable via ensureTextLoaded on demand
          // (e.g. as the reader navigates), so a dropped background call
          // degrades to "loads on demand" rather than "broken".
          return sections;
        });
    }
    return backgroundPromiseRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `sections` here is only the fallback value for an already-dropped request; including it would re-create this callback (and its memoized identity, which Reader.tsx's own once-per-mount effect relies on) on every text update.
  }, [materialId]);

  return useMemo(
    () => ({ sections, isTextLoaded, ensureTextLoaded, loadAllTextInBackground }),
    [sections, isTextLoaded, ensureTextLoaded, loadAllTextInBackground]
  );
}
