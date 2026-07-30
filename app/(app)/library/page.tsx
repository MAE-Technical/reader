import { listBooks } from "@/lib/book/repository";
import { toLibraryBookSummary } from "@/app/components/shell/libraryBook";
import LibraryView from "@/app/components/shell/LibraryView";

export default async function LibraryPage() {
  const books = await listBooks();
  return <LibraryView books={books.map(toLibraryBookSummary)} />;
}
