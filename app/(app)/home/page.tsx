import { listBooks } from "@/lib/book/repository";
import { toCommunityBookMeta } from "@/lib/home/communityBook";
import { toLibraryBookSummary } from "@/app/components/shell/libraryBook";
import HomeCommunityFeed from "@/app/components/home/HomeCommunityFeed";

export default async function HomePage() {
  const books = await listBooks();
  return (
    <HomeCommunityFeed
      booksMeta={books.map(toCommunityBookMeta)}
      continueReadingBooks={books.map(toLibraryBookSummary)}
    />
  );
}
