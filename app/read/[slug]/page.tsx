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
  // ?listen=1 — set by the book-detail page's own Listen button, which now
  // reaches this page via a real navigation (see its own hardNavigate
  // comment) rather than the router.push+openBook() it used when this was
  // a soft one — this is how it hands that intent off instead.
  searchParams: Promise<{ section?: string; passage?: string; note?: string; listen?: string }>;
}) {
  const { slug } = await params;
  const { section, passage, note, listen } = await searchParams;

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
  return (
    <Reader
      book={book}
      targetSectionId={section}
      targetPassageId={passage}
      targetNoteId={note}
      autoListen={listen === "1"}
    />
  );
}
