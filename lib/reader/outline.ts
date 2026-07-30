import type { Section } from "@/lib/book/schema";
import { sectionLabel } from "./sectionHeading";

export type OutlineRow = { section: Section; depth: number; isGroup: boolean };

/**
 * Flattens a book's section tree into ordered display rows — a group row
 * for any section with children (a "part"), a row for every labeled leaf
 * (a "chapter") — depth-first, same order the tree itself defines. This is
 * the single source of truth for "list this book's contents," shared by the
 * reader's TOC drawer (ChaptersDrawer) and the book-detail page's Outline
 * tab so the two can't drift into different notions of what counts as a
 * chapter. `onlyBody` additionally drops non-body leaves (title page,
 * copyright, acknowledgements, etc.) — the drawer wants every real page
 * reachable while reading, but a top-level outline reads better without
 * front/back matter cluttering it.
 */
export function buildOutlineRows(sections: Section[], opts: { onlyBody?: boolean } = {}): OutlineRow[] {
  const { onlyBody = false } = opts;
  const rows: OutlineRow[] = [];
  const walk = (secs: Section[], depth: number) => {
    for (const s of secs) {
      const isGroup = s.children.length > 0;
      if (!isGroup) {
        if (!sectionLabel(s)) continue;
        if (onlyBody && s.kind !== "body") continue;
      }
      rows.push({ section: s, depth, isGroup });
      walk(s.children, depth + 1);
    }
  };
  walk(sections, 0);
  return rows;
}
