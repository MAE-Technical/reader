import { notFound } from "next/navigation";
import Reader from "@/app/components/Reader";
import { BookNotFoundError, getBookDocument } from "@/lib/book/repository";

export default async function ReadBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  // ?section=<sectionId> — set by the book-detail page's chapter links
  // (app/(app)/book/[slug]) to jump straight to that chapter on this one
  // load, without touching the reader's own saved resume position.
  searchParams: Promise<{ section?: string }>;
}) {
  const { slug } = await params;
  const { section } = await searchParams;

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
  return <Reader book={book} targetSectionId={section} />;
}
