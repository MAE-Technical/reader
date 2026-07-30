"use client";

import { useEffect, useMemo, useState } from "react";
import AppHeader from "./AppHeader";
import CategoryPills, { DEFAULT_CATEGORIES } from "./CategoryPills";
import BookCard from "./BookCard";
import type { LibraryBookSummary } from "./libraryBook";
import { useLibraryStore } from "@/stores/library-store";

export default function LibraryView({ books }: { books: LibraryBookSummary[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>(DEFAULT_CATEGORIES[0]);

  // library-store skips automatic persist hydration (see its own doc
  // comment) so the server and first client paint agree — rehydrated here
  // the same way Reader.tsx does, since this is the other place a real
  // saved position (for each card's progress bar) is read from.
  useEffect(() => {
    useLibraryStore.persist.rehydrate();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter((book) => {
      // No book has a category assigned yet (BookMetadata has no such
      // field) — "All" is the only pill anything currently matches; the
      // rest are manually seeded ahead of that data actually existing.
      if (category !== "All") return false;
      if (!q) return true;
      return book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q);
    });
  }, [books, query, category]);

  return (
    <div className="pb-10">
      <AppHeader searchValue={query} onSearchChange={setQuery} />

      <h1 className="mt-1 mb-4 font-serif text-2xl font-semibold text-[var(--reader-text)]">Library</h1>

      <div className="mb-10">
        <CategoryPills selected={category} onSelect={setCategory} />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--reader-text-muted)]">
          {books.length === 0
            ? "No books ingested yet."
            : category !== "All"
              ? `No books tagged "${category}" yet.`
              : "No books match your search."}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
