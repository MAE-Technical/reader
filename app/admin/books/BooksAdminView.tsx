"use client";

import { BookOpen, Loader2, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type AdminBookStatus = "published" | "unpublished";

export type AdminBookRow = {
  id: string;
  title: string;
  author: string;
  description: string | null;
  cover_url: string | null;
  thumbnail_url: string | null;
  categories: string[];
  status: AdminBookStatus;
  updated_at: string;
};

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium"
  }).format(new Date(value));
}

function parseCategories(value: string) {
  return value
    .split(",")
    .map((category) => category.trim())
    .filter(Boolean);
}

export default function BooksAdminView({ books }: { books: AdminBookRow[] }) {
  const [items, setItems] = useState(() => books);
  const [selectedId, setSelectedId] = useState<string | null>(() => books[0]?.id ?? null);

  const selectedBook = items.find((book) => book.id === selectedId) ?? null;

  const updateBook = (id: string, next: Partial<AdminBookRow> & { status?: AdminBookStatus }) => {
    setItems((current) =>
      current.map((book) =>
        book.id === id
          ? {
              ...book,
              ...next,
              status: next.status ?? book.status,
            }
          : book
      )
    );
  };

  return (
    <div className="grid min-h-[calc(100vh-4rem)] gap-0 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0 pr-0 xl:pr-6">
        <header className="mb-9">
          <p className="mb-2 text-sm font-semibold text-brand-500">Admin</p>
          <h1 className="m-0 font-serif text-2xl font-bold tracking-tight text-[var(--reader-text)]">Books</h1><span className="text-xs font-semibold text-[var(--reader-text-muted)]">{books.length} Total</span>
        </header>

        <div className="overflow-hidden rounded-2xl bg-[var(--reader-surface)]">
          {items.length === 0 ? (
            <p className="m-0 px-5 py-10 text-sm text-[var(--reader-text-muted)]">No published books are available right now.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--reader-border)] text-left text-xs font-medium uppercase tracking-[0.12em] text-[var(--reader-text-subtle)]">
                  <th className="px-2 py-3 font-[inherit]">Cover</th>
                  <th className="px-2 py-3 font-[inherit]">Title</th>
                  <th className="px-2 py-3 font-[inherit]">Author</th>
                  <th className="px-2 py-3 font-[inherit]">Status</th>
                  <th className="px-2 py-3 font-[inherit]">Updated</th>
                </tr>
              </thead>
              <tbody>
                {items.map((book) => {
                  const isActive = selectedId === book.id;
                  const coverSrc = book.thumbnail_url ?? book.cover_url;
                  return (
                    <tr
                      key={book.id}
                      onClick={() => setSelectedId(book.id)}
                      className={`cursor-pointer border-b border-[var(--reader-border)] transition-colors ${isActive ? "bg-[var(--reader-surface-hover)]" : "hover:bg-[var(--reader-surface-hover)]"}`}
                    >
                      <td className="px-2 py-2.5 align-middle">
                        <div className="relative flex h-10 w-10 overflow-hidden bg-[var(--reader-surface-hover)]">
                          {coverSrc ? (
                            <Image src={coverSrc} alt="" fill unoptimized sizes="32px" className="object-cover" />
                          ) : (
                            <span className="m-auto inline-flex text-[var(--reader-text-subtle)]">
                              <BookOpen size={14} />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-left align-middle">
                        <span className="block truncate w-108 text-[12px] font-medium text-[var(--reader-text)]">{book.title}</span>
                      </td>
                      <td className="px-2 py-2.5 text-left text-[12px] text-[var(--reader-text-muted)] align-middle">
                        <span className="block truncate">{book.author}</span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-left text-[12px] capitalize text-[var(--reader-text-muted)] align-middle">{book.status}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-left text-[12px] text-[var(--reader-text-muted)] align-middle">{formatUpdatedAt(book.updated_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <aside className="min-w-0 border-[var(--reader-border)] bg-[var(--reader-surface)] xl:min-h-[calc(100vh-4rem)] xl:border-l xl:pl-6 xl:sticky xl:top-0 xl:h-[calc(100vh-4rem)] xl:overflow-auto">
        {selectedBook ? (
          <BookEditPanel key={selectedBook.id} book={selectedBook} onSaved={updateBook} onClose={() => setSelectedId(null)} />
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <p className="m-0 max-w-xs text-sm leading-6 text-[var(--reader-text-muted)]">Select a book</p>
          </div>
        )}
      </aside>
    </div>
  );
}

function BookEditPanel({
  book,
  onSaved,
  onClose,
}: {
  book: AdminBookRow;
  onSaved: (id: string, next: Partial<AdminBookRow> & { status?: AdminBookStatus }) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [description, setDescription] = useState(book.description ?? "");
  const [categories, setCategories] = useState(book.categories.join(", "));
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (nextStatus: AdminBookStatus = book.status) => {
    setState("saving");
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/materials/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          author,
          description: description.trim() || null,
          categories: parseCategories(categories),
          status: nextStatus,
        }),
      });

      const result = (await response.json().catch(() => null)) as { error?: string; item?: { updated_at?: string } } | null;
      if (!response.ok) throw new Error(result?.error || "We could not update this book.");

      setState("saved");
      setMessage(nextStatus === "published" ? (book.status === "unpublished" ? "Book published." : "Book updated.") : "Book unpublished.");
      onSaved(book.id, {
        title,
        author,
        description: description.trim() || null,
        categories: parseCategories(categories),
        status: nextStatus,
        updated_at: result?.item?.updated_at ?? book.updated_at,
      });
    } catch (updateError) {
      setState("error");
      setMessage(updateError instanceof Error ? updateError.message : "We could not update this book.");
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-end">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close book editor"
          className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-full text-[var(--reader-text-muted)] transition-colors hover:bg-[var(--reader-surface-hover)] hover:text-[var(--reader-text)]"
        >
          <X size={16} />
        </button>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit(book.status);
        }}
        className="flex-1 space-y-4 px-5 py-5"
      >
        <label className="block">
          <span className="mb-2 block text-[12px] font-bold text-[var(--reader-text)]">Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-sm border border-sand-300 bg-[var(--reader-surface)] px-4 py-2.5 text-[12px] font-medium text-[var(--reader-text)] outline-none transition-colors focus:border-brand-400"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[12px] font-bold text-[var(--reader-text)]">Description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={5}
            className="w-full rounded-sm border border-sand-300 bg-[var(--reader-surface)] px-4 py-2.5 text-[12px] font-medium text-[var(--reader-text)] outline-none transition-colors focus:border-brand-400"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[12px] font-bold text-[var(--reader-text)]">Author</span>
          <input
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            className="w-full rounded-sm border border-sand-300 bg-[var(--reader-surface)] px-4 py-2.5 text-[12px] font-medium text-[var(--reader-text)] outline-none transition-colors focus:border-brand-400"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[12px] font-bold text-[var(--reader-text)]">Categories</span>
          <textarea
            value={categories}
            onChange={(event) => setCategories(event.target.value)}
            rows={3}
            placeholder="Separate categories with commas."
            className="w-full rounded-sm border border-sand-300 bg-[var(--reader-surface)] px-4 py-2.5 text-[12px] font-medium text-[var(--reader-text)] outline-none transition-colors focus:border-brand-400"
          />
        </label>

        {message && (
          <p role="status" className={`mb-3 rounded-sm px-4 py-3 text-[12px] font-semibold ${state === "error" ? "bg-brand-500/10 text-[var(--reader-text)]" : "bg-emerald-500/10 text-[var(--reader-text)]"}`}>
            {message}
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="submit"
            disabled={state === "saving"}
            className="inline-flex cursor-pointer items-center justify-center rounded-sm bg-brand-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state === "saving" ? "Updating…" : "Update"}
          </button>
          <button
            type="button"
            disabled={state === "saving"}
            onClick={() => void submit(book.status === "published" ? "unpublished" : "published")}
            className="inline-flex cursor-pointer items-center justify-center rounded-sm border border-brand-500/30 bg-transparent px-3 py-2 text-xs font-bold text-brand-500 transition-colors hover:bg-brand-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state === "saving" ? <Loader2 size={16} className="animate-spin" /> : book.status === "published" ? "Unpublish" : "Publish"}
          </button>
        </div>
      </form>
    </div>
  );
}
