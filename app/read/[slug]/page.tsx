import { notFound } from "next/navigation";
import Reader from "@/app/components/reader/Reader";
import { BookNotFoundError, getBookDocument } from "@/lib/book/repository";

export default async function ReadBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  // ?section=<sectionId> — set by the book-detail page's chapter links
  // (app/(app)/book/[slug]) to jump straight to that chapter on this one
  // load, without touching the reader's own saved resume position.
  // ?passage=<passageId>&note=<annotationId> — set by the home community
  // feed's cards, narrowing that further to one exact passage and
  // (optionally, paired with it) opening that annotation's thread once
  // the reader has landed.
  searchParams: Promise<{ section?: string; passage?: string; note?: string }>;
}) {
  const { slug } = await params;
  const { section, passage, note } = await searchParams;

  let book;
  try {
    book = await getBookDocument(slug);
  } catch (err) {
    if (err instanceof BookNotFoundError) {
      notFound();
    }
    // BookValidationError and anything unexpected surface through error.tsx
    throw err;
  }
  return <Reader book={book} targetSectionId={section} targetPassageId={passage} targetNoteId={note} />;
}
