import type { Metadata } from "next";
import BooksAdminView from "./BooksAdminView";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { getCategories } from "@/lib/categories/config";
import { parseGoogleMetaData, parseOpenLibraryMetaData } from "@/lib/materials/providerMeta";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Books admin",
  robots: { index: false, follow: false },
};

export default async function AdminBooksPage() {
  const admin = getSupabaseAdminClient();
  const [{ data: books, error: booksError }, categories] = await Promise.all([
    admin
      .from("materials")
      .select(
        "id, title, author, description, cover_url, thumbnail_url, categories, status, updated_at, google_meta_data, openlibrary_meta_data, cover_source"
      )
      .order("updated_at", { ascending: false }),
    getCategories(),
  ]);

  if (booksError) throw new Error(`Could not load library books: ${booksError.message}`);

  return (
    <>
      <BooksAdminView
        categories={categories}
        books={(books ?? []).map(({ google_meta_data, openlibrary_meta_data, cover_source, ...book }) => {
          const google = parseGoogleMetaData(google_meta_data);
          const openlibrary = parseOpenLibraryMetaData(openlibrary_meta_data);
          return {
            ...book,
            categories: (book.categories as string[]) ?? [],
            status: book.status === "published" ? "published" : "unpublished",
            googleCoverUrl: google.coverUrl,
            googleThumbnailUrl: google.thumbnailUrl,
            openlibraryCoverUrl: openlibrary.coverUrl,
            openlibraryThumbnailUrl: openlibrary.thumbnailUrl,
            coverSource: cover_source,
          };
        })}
      />
    </>
  );
}
