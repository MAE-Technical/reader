import type { BookDocument } from "@/lib/book/schema";
import { buildPassageIndex, buildSectionsById } from "@/lib/reader/sections";
import { sectionLabel } from "@/lib/reader/sectionHeading";

/** Just enough of a book to place a note on the home community feed and
 * quote what it's actually attached to — flat passageId->sectionId,
 * sectionId->label, and passageId->text lookups, rather than the full
 * content tree. `passageText` does mean every passage's plain text
 * reaches the client (not just the ones with notes on them — the server
 * doesn't know which those are; that's client-only localStorage data),
 * but that's no more than what already ships the moment any one of these
 * books is opened in the reader itself, and it's what makes an excerpt
 * always computable the exact same way the reader computes one
 * (quoteForRanges) — no dependency on a note having been created (or
 * viewed) after some particular point in time. */
export type CommunityBookMeta = {
  id: string;
  slug: string;
  title: string;
  author: string;
  cover: string;
  sectionOfPassage: Record<string, string>;
  sectionLabels: Record<string, string>;
  passageText: Record<string, string>;
};

export function toCommunityBookMeta(book: BookDocument): CommunityBookMeta {
  const sectionsById = buildSectionsById(book.sections);
  const passageIndex = buildPassageIndex(book.sections);

  const sectionOfPassage: Record<string, string> = {};
  const passageText: Record<string, string> = {};
  for (const [passageId, { sectionId, passage }] of passageIndex) {
    sectionOfPassage[passageId] = sectionId;
    passageText[passageId] = passage.text;
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
    passageText,
  };
}
