"use client";

import { useState } from "react";
import Link from "next/link";
import PendingMaterialsTable from "./PendingMaterialsTable";
import type { PendingMaterial } from "@/lib/materials/pending";

export type AdminBookRow = { id: string; title: string; author: string; categories: string[]; status: "draft" | "published"; updated_at: string };
type Tab = "pending" | "available";

const TAB_OPTIONS: Array<{ value: Tab; label: string }> = [
  { value: "available", label: "Available" },
  { value: "pending", label: "Pending" },
];

/** Uses the exact underline-tab treatment from the reader's book details,
 * keeping admin navigation visually part of the same product language. */
export default function BooksAdminView({ books, pending }: { books: AdminBookRow[]; pending: PendingMaterial[] }) {
  const [tab, setTab] = useState<Tab>("available");

  return (
    <>
      <div className="mb-0 flex gap-6 border-b border-[var(--reader-border)]">
        {TAB_OPTIONS.map((option) => {
          const active = option.value === tab;
          const count = option.value === "pending" ? pending.length : books.length;
          return (
            <button key={option.value} type="button" onClick={() => setTab(option.value)} className={`-mb-px cursor-pointer border-b-2 bg-transparent px-0.5 pb-3 text-sm font-semibold transition-colors ${active ? "border-[var(--reader-text)] text-[var(--reader-text)]" : "border-transparent text-[var(--reader-text-subtle)] hover:text-[var(--reader-text-muted)]"}`}>
              {option.label} <span className="ml-0.5 text-[var(--reader-text-subtle)]">({count})</span>
            </button>
          );
        })}
      </div>

      {tab === "pending" ? <PendingMaterialsTable materials={pending} /> : <AvailableBooksTable books={books} />}
    </>
  );
}

function AvailableBooksTable({ books }: { books: AdminBookRow[] }) {
  if (books.length === 0) return <p className="m-0 py-8 text-center text-sm text-[var(--reader-text-muted)]">No books have been ingested yet.</p>;

  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 border-b border-[var(--reader-border)] py-3 text-xs font-semibold text-[var(--reader-text-subtle)] sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]">
        <span>Title</span>
        <span className="hidden sm:block">Author</span>
        <span>Updated</span>
      </div>
      {books.map((book) => (
        <Link
          key={book.id}
          href={`/admin/books/materials/${book.id}`}
          className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 border-b border-[var(--reader-border)] py-4 no-underline transition-colors last:border-b-0 hover:bg-[var(--reader-surface-hover)] sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]"
        >
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-[var(--reader-text)]">{book.title}</span>
            <span className="mt-1 block truncate text-sm text-[var(--reader-text-muted)] sm:hidden">{book.author}</span>
          </span>
          <span className="hidden truncate text-sm text-[var(--reader-text-muted)] sm:block">{book.author}</span>
          <span className="text-right text-xs text-[var(--reader-text-subtle)]">{formatDate(book.updated_at)}</span>
        </Link>
      ))}
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}
