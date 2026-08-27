import type { Metadata } from "next";
import BooksAdminView from "./BooksAdminView";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Books admin",
  robots: { index: false, follow: false },
};

export default async function AdminBooksPage() {
  const admin = getSupabaseAdminClient();
  const { data: books, error: booksError } = await admin
    .from("materials")
    .select("id, title, author, description, cover_url, thumbnail_url, categories, status, updated_at")
    .order("title");

  if (booksError) throw new Error(`Could not load library books: ${booksError.message}`);

  return (
    <>
      <BooksAdminView
        books={(books ?? []).map((book) => ({
          ...book,
          categories: (book.categories as string[]) ?? [],
          status: book.status === "published" ? "published" : "unpublished",
        }))}
      />
    </>
  );
}
