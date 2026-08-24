import type { Metadata } from "next";
import BooksAdminView from "./BooksAdminView";
import { listPendingMaterials } from "@/lib/materials/pending";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Books admin",
  robots: { index: false, follow: false },
};

export default async function AdminBooksPage() {
  const admin = getSupabaseAdminClient();
  const [{ data: books, error: booksError }, pending] = await Promise.all([
    admin.from("materials").select("id, title, author, categories, status, updated_at").eq("status", "published").order("title"),
    listPendingMaterials(),
  ]);

  if (booksError) throw new Error(`Could not load library books: ${booksError.message}`);

  return (
    <>
      <header className="mb-9">
        <p className="mb-2 text-sm font-semibold text-brand-500">Library Admin</p>
        <h1 className="m-0 font-serif text-2xl font-bold tracking-tight text-[var(--reader-text)]">Books</h1>
        {/* <p className="mt-2 mb-0 text-[14px] leading-relaxed text-[var(--reader-text-muted)]">Review community submissions alongside the books already available to readers.</p> */}
      </header>

      <BooksAdminView books={(books ?? []).map((book) => ({ ...book, categories: (book.categories as string[]) ?? [] }))} pending={pending} />
    </>
  );
}
