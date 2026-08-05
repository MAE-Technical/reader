import type { TocSection } from "@/lib/api/types";

export type TocOutlineRow = { section: TocSection; depth: number; isGroup: boolean };

/**
 * DB-only counterpart to `lib/reader/outline.ts`'s `buildOutlineRows` — same
 * flattening (a group row for any section with children, a row per labeled
 * leaf, depth-first), just walking the pruned `TocSection[]` outline
 * (`materials.toc`, precomputed at publish time) instead of the full
 * `Section[]` tree, so the book-detail page never needs passage content to
 * render its chapter list. `label`/`passageCount` are already resolved —
 * no `sectionLabel()` fallback needed the way `Section.title` requires.
 */
export function buildTocOutlineRows(sections: TocSection[]): TocOutlineRow[] {
  const rows: TocOutlineRow[] = [];
  const walk = (secs: TocSection[], depth: number) => {
    for (const s of secs) {
      const isGroup = s.children.length > 0;
      if (!isGroup && !s.label) continue;
      rows.push({ section: s, depth, isGroup });
      walk(s.children, depth + 1);
    }
  };
  walk(sections, 0);
  return rows;
}
