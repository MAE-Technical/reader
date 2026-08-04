import { notFound } from "next/navigation";
import ReaderModal from "@/app/components/reader/ReaderModal";
import { BookNotFoundError, getBookDocument } from "@/lib/book/repository";

/** Same server-side load as app/read/[slug]/page.tsx, deliberately
 * duplicated rather than shared — this is the one other place a book gets
 * loaded for the reader, and the two pages diverge in what they render
 * around it (ReaderModal vs. Reader directly), so a shared helper would buy
 * little. Intercepts any client-side navigation to /read/[slug] that
 * originates from elsewhere under the root layout (the home community
 * feed today), rendering it as an overlay via the @modal parallel slot
 * instead of replacing the current page — a hard refresh or a direct link
 * still resolves to the real app/read/[slug]/page.tsx, since interception
 * only applies to client-side <Link>/router navigation. */
export default async function ReadBookModalPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
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
    throw err;
  }
  return <ReaderModal book={book} targetSectionId={section} targetPassageId={passage} targetNoteId={note} />;
}
