import type { BookDocument } from "@/lib/book/schema";
import { buildProgressShape, type ProgressShape } from "@/lib/reader/progress";

/** Just enough of a book to render a library card — deliberately not the
 * full BookDocument (all passage text), which would otherwise ship an
 * entire book's content to the client just to draw a cover + progress bar. */
export type LibraryBookSummary = {
  id: string;
  slug: string;
  title: string;
  author: string;
  cover: string;
  pageCountEstimate: number;
  progress: ProgressShape;
};

export function toLibraryBookSummary(book: BookDocument): LibraryBookSummary {
  return {
    id: book.id,
    slug: book.slug,
    title: book.metadata.title,
    author: book.metadata.author,
    cover: book.metadata.cover,
    pageCountEstimate: book.metadata.pageCountEstimate,
    progress: buildProgressShape(book),
  };
}
