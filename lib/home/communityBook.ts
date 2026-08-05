import type { BookDocument } from "@/lib/book/schema";
import { buildPassageIndex, buildSectionsById } from "@/lib/reader/sections";
import { sectionLabel } from "@/lib/reader/sectionHeading";

/** Just enough of a book to place a note on the home community feed —
 * flat passageId->sectionId and sectionId->label lookups, so a card can
 * show which chapter its note belongs to and jump there. Deliberately
 * *not* every passage's own text anymore (a `passageText` map used to live
 * here too) — that meant every book's entire content shipped with every
 * single /home load regardless of whether any of it was ever quoted, which
 * stopped being a rounding error the moment the library grew past a couple
 * of short books (a home page north of 7MB, large enough to blow past
 * Turbopack dev's own per-Suspense-boundary RSC stream). A feed card's own
 * excerpt is a dummy placeholder for now (see communityFeed.ts's
 * DUMMY_EXCERPT_PLACEHOLDER) until a real community-feed API endpoint
 * exists to fetch it from. */
export type CommunityBookMeta = {
  id: string;
  slug: string;
  title: string;
  author: string;
  cover: string;
  sectionOfPassage: Record<string, string>;
  sectionLabels: Record<string, string>;
};

export function toCommunityBookMeta(book: BookDocument): CommunityBookMeta {
  const sectionsById = buildSectionsById(book.sections);
  const passageIndex = buildPassageIndex(book.sections);

  const sectionOfPassage: Record<string, string> = {};
  for (const [passageId, { sectionId }] of passageIndex) {
    sectionOfPassage[passageId] = sectionId;
  }

  const sectionLabels: Record<string, string> = {};
  for (const [sectionId, section] of sectionsById) {
    const label = sectionLabel(section);
    if (label) sectionLabels[sectionId] = label;
  }

  return {
    id: book.id,
    slug: book.slug,
    title: book.metadata.title,
    author: book.metadata.author,
    cover: book.metadata.cover,
    sectionOfPassage,
    sectionLabels,
  };
}
