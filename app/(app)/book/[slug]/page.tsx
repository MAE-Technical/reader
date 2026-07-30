import { notFound } from "next/navigation";
import { BookNotFoundError, getBookDocument } from "@/lib/book/repository";
import BookDetailView from "@/app/components/book/BookDetailView";

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let book;
  try {
    book = await getBookDocument(slug);
  } catch (err) {
    if (err instanceof BookNotFoundError) {
      notFound();
    }
    throw err;
  }
  return <BookDetailView book={book} />;
}
