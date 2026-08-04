import { listBooks } from "@/lib/book/repository";
import { toLibraryBookSummary } from "@/app/components/shell/libraryBook";
import SurveyWizard from "@/app/components/auth/SurveyWizard";

/**
 * "Have you read any of these books?" pulls from the real book list (demo
 * stand-in for a proper recommendation seed) rather than a hardcoded set.
 */
export default async function SurveyPage() {
  const books = await listBooks();
  return <SurveyWizard books={books.map(toLibraryBookSummary)} />;
}
