"use client";

import { BookOpen, ExternalLink, Loader2, Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { resolveBookThumbnailSrc, type CoverSource } from "@/lib/materials/image";

type AdminBookStatus = "published" | "unpublished";

export type AdminBookRow = {
  id: string;
  title: string;
  author: string;
  description: string | null;
  cover_url: string | null;
  thumbnail_url: string | null;
  // The other two cover sources materials carry alongside our own
  // cover_url/thumbnail_url — see lib/materials/image.ts's priority chain.
  // Surfaced so the edit panel can offer them as alternates when our own
  // pick looks wrong, not because anything else in the app reads them.
  googleCoverUrl: string | null;
  googleThumbnailUrl: string | null;
  openlibraryCoverUrl: string | null;
  openlibraryThumbnailUrl: string | null;
  // Which of the three sources above is currently preferred — see
  // migrations/20260829_materials_cover_source.sql. Switching this never
  // overwrites cover_url/thumbnail_url/the metadata columns, so it's always
  // reversible, unlike editing cover_url directly.
  coverSource: CoverSource;
  categories: string[];
  status: AdminBookStatus;
  updated_at: string;
};

const RELATIVE_TIME_UNITS: { unit: Intl.RelativeTimeFormatUnit; ms: number }[] = [
  { unit: "year", ms: 1000 * 60 * 60 * 24 * 365 },
  { unit: "month", ms: 1000 * 60 * 60 * 24 * 30 },
  { unit: "week", ms: 1000 * 60 * 60 * 24 * 7 },
  { unit: "day", ms: 1000 * 60 * 60 * 24 },
  { unit: "hour", ms: 1000 * 60 * 60 },
  { unit: "minute", ms: 1000 * 60 },
];

const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

// Same danger red used for the reader's own "Delete highlight" confirmation
// (NotesSidebar.tsx/SelectionMenu.tsx) — one color for "this is destructive"
// across the app.
const DANGER_COLOR = "#f26b6b";

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatUpdatedAt(value: string) {
  const diffMs = new Date(value).getTime() - Date.now();
  const absDiffMs = Math.abs(diffMs);

  if (absDiffMs < 1000 * 60) return "Just now";

  for (const { unit, ms } of RELATIVE_TIME_UNITS) {
    if (absDiffMs >= ms) {
      return capitalize(relativeTimeFormatter.format(Math.round(diffMs / ms), unit));
    }
  }

  return capitalize(relativeTimeFormatter.format(Math.round(diffMs / (1000 * 60)), "minute"));
}

export default function BooksAdminView({ books, categories }: { books: AdminBookRow[]; categories: string[] }) {
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

  const removeBook = (id: string) => {
    setItems((current) => current.filter((book) => book.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  };

  return (
    <div className="grid min-h-[calc(100vh-4rem)] gap-0 xl:grid-cols-[minmax(0,1fr)_420px]">
      <div className="min-w-0 pr-0 xl:pr-6">
        <header className="mb-2">
          <p className="mb-2 text-sm font-semibold text-brand-500">Admin</p>
          <h1 className="m-0 font-serif text-2xl font-bold tracking-tight text-[var(--reader-text)]">Books</h1><span className="text-xs font-semibold text-[var(--reader-text-muted)]">{books.length} Total</span>
        </header>

        <div className="overflow-hidden rounded-2xl bg-[var(--reader-surface)]">
          {items.length === 0 ? (
            <p className="m-0 px-5 py-10 text-sm text-[var(--reader-text-muted)]">No published books are available right now.</p>
          ) : (
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-14" />
                <col className="w-[26%]" />
                <col className="w-[16%]" />
                <col className="w-[22%]" />
                <col className="w-24" />
                <col className="w-28" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--reader-border)] text-left text-xs font-medium uppercase tracking-[0.12em] text-[var(--reader-text-subtle)]">
                  <th className="px-2 py-3 font-[inherit]">Cover</th>
                  <th className="px-2 py-3 font-[inherit]">Title</th>
                  <th className="px-2 py-3 font-[inherit]">Author</th>
                  <th className="px-2 py-3 font-[inherit]">Categories</th>
                  <th className="px-2 py-3 font-[inherit]">Status</th>
                  <th className="px-2 py-3 font-[inherit]">Updated</th>
                </tr>
              </thead>
              <tbody>
                {items.map((book) => {
                  const isActive = selectedId === book.id;
                  const coverSrc = resolveBookThumbnailSrc({
                    cover: book.cover_url,
                    thumbnail: book.thumbnail_url,
                    googleCoverUrl: book.googleCoverUrl,
                    googleThumbnailUrl: book.googleThumbnailUrl,
                    openlibraryCoverUrl: book.openlibraryCoverUrl,
                    openlibraryThumbnailUrl: book.openlibraryThumbnailUrl,
                    coverSource: book.coverSource,
                  });
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
                        <span className="block truncate text-[12px] font-medium text-[var(--reader-text)]">{book.title}</span>
                      </td>
                      <td className="px-2 py-2.5 text-left text-[12px] text-[var(--reader-text-muted)] align-middle">
                        <span className="block truncate">{book.author}</span>
                      </td>
                      <td className="px-2 py-2.5 text-left text-[12px] text-[var(--reader-text-muted)] align-middle">
                        <span className="block truncate">{book.categories.join(", ")}</span>
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
          <BookEditPanel
            key={selectedBook.id}
            book={selectedBook}
            availableCategories={categories}
            onSaved={updateBook}
            onDeleted={removeBook}
            onClose={() => setSelectedId(null)}
          />
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
  availableCategories,
  onSaved,
  onDeleted,
  onClose,
}: {
  book: AdminBookRow;
  availableCategories: string[];
  onSaved: (id: string, next: Partial<AdminBookRow> & { status?: AdminBookStatus }) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(book.title);
  const [author, setAuthor] = useState(book.author);
  const [description, setDescription] = useState(book.description ?? "");
  const [categories, setCategories] = useState(book.categories);
  const [coverSource, setCoverSource] = useState(book.coverSource);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteState, setDeleteState] = useState<"idle" | "deleting" | "error">("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleteState("deleting");
    setDeleteError(null);
    try {
      const response = await fetch(`/api/admin/materials/${book.id}`, { method: "DELETE" });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || "We could not delete this book.");
      onDeleted(book.id);
    } catch (err) {
      setDeleteState("error");
      setDeleteError(err instanceof Error ? err.message : "We could not delete this book.");
    }
  };

  // Books saved before the config list existed (or edited directly) may
  // carry a category that has since been renamed or removed there. Keep
  // those visible and removable alongside the config options instead of
  // silently dropping them.
  const categoryOptions = Array.from(new Set([...availableCategories, ...book.categories]));

  // The three cover sources a material can carry (see lib/materials/image.ts).
  // Picking one here only changes which the resolver tries first — it never
  // touches cover_url/thumbnail_url/the metadata columns, so it's always
  // reversible by picking a different one back.
  const coverSources: { id: CoverSource; label: string; coverUrl: string; thumbnailUrl: string }[] = [
    book.cover_url || book.thumbnail_url
      ? { id: "own" as const, label: "Our upload", coverUrl: book.cover_url ?? book.thumbnail_url!, thumbnailUrl: book.thumbnail_url ?? book.cover_url! }
      : null,
    book.openlibraryCoverUrl || book.openlibraryThumbnailUrl
      ? {
          id: "openlibrary" as const,
          label: "OpenLibrary",
          coverUrl: book.openlibraryCoverUrl ?? book.openlibraryThumbnailUrl!,
          thumbnailUrl: book.openlibraryThumbnailUrl ?? book.openlibraryCoverUrl!,
        }
      : null,
    book.googleCoverUrl || book.googleThumbnailUrl
      ? {
          id: "google" as const,
          label: "Google Books",
          coverUrl: book.googleCoverUrl ?? book.googleThumbnailUrl!,
          thumbnailUrl: book.googleThumbnailUrl ?? book.googleCoverUrl!,
        }
      : null,
  ].filter((source) => source !== null);

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
          categories,
          coverSource,
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
        categories,
        coverSource,
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
      <div className="flex items-start justify-between">
        {book.status === "published" ? (
          <Link
            href={`/book/${book.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-[12px] font-semibold text-brand-500 transition-colors hover:bg-[var(--reader-surface-hover)] hover:text-brand-600"
          >
            View book
            <ExternalLink size={13} />
          </Link>
        ) : (
          <span className="px-2 py-1.5 text-[12px] font-semibold text-[var(--reader-text-subtle)]">Publish to preview live</span>
        )}
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
          <span className="mb-2 block text-[12px] font-bold text-[var(--reader-text)]">Cover</span>
          {coverSources.length > 1 ? (
            <div className="flex flex-wrap gap-3">
              {coverSources.map((source) => {
                const active = source.id === coverSource;
                return (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => setCoverSource(source.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-sm border p-1.5 transition-colors ${
                      active ? "border-brand-500" : "border-sand-300 hover:border-brand-300"
                    }`}
                  >
                    <span className="relative block h-24 w-16 overflow-hidden rounded-xs bg-[var(--reader-surface-hover)]">
                      <Image src={source.thumbnailUrl} alt="" fill unoptimized sizes="64px" className="object-cover" />
                    </span>
                    <span className={`text-[10px] font-semibold ${active ? "text-brand-500" : "text-[var(--reader-text-muted)]"}`}>{source.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="m-0 text-[12px] text-[var(--reader-text-muted)]">No alternate cover sources found for this book.</p>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-[12px] font-bold text-[var(--reader-text)]">Categories</span>
          <CategoryTagInput categories={categories} availableCategories={categoryOptions} onChange={setCategories} />
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

        <div className="mt-2 border-t border-[var(--reader-border)] pt-4">
          {confirmingDelete ? (
            <div className="flex flex-col gap-3">
              <p className="m-0 text-[12px] font-medium leading-relaxed text-[var(--reader-text)]">
                Delete this book and all its files (cover, images, audio)? This can&rsquo;t be undone.
              </p>
              {deleteError && (
                <p role="status" className="m-0 text-[12px] font-semibold" style={{ color: DANGER_COLOR }}>
                  {deleteError}
                </p>
              )}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={deleteState === "deleting"}
                  style={{ color: DANGER_COLOR }}
                  className="inline-flex cursor-pointer items-center gap-1.5 bg-transparent border-none p-0 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleteState === "deleting" ? <Loader2 size={14} className="animate-spin" /> : null}
                  {deleteState === "deleting" ? "Deleting…" : "Delete"}
                </button>
                <button
                  type="button"
                  disabled={deleteState === "deleting"}
                  onClick={() => {
                    setConfirmingDelete(false);
                    setDeleteState("idle");
                    setDeleteError(null);
                  }}
                  className="cursor-pointer bg-transparent border-none p-0 text-xs font-semibold text-[var(--reader-text-muted)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              style={{ color: DANGER_COLOR }}
              className="inline-flex cursor-pointer items-center gap-1.5 bg-transparent border-none p-0 text-xs font-bold"
            >
              <Trash2 size={13} />
              Delete book
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

/**
 * A Substack-style tag input: selected categories render as removable pills
 * inside the field itself, and typing filters the config list into a
 * dropdown of suggestions to pick from. Nothing here saves on its own —
 * it just edits the local `categories` array, same as any other field, and
 * the panel's Update button persists it.
 */
function CategoryTagInput({
  categories,
  availableCategories,
  onChange,
}: {
  categories: string[];
  availableCategories: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const suggestions = availableCategories.filter(
    (category) => !categories.includes(category) && category.toLowerCase().includes(query.trim().toLowerCase())
  );

  const addCategory = (category: string) => {
    onChange(categories.includes(category) ? categories : [...categories, category]);
    setQuery("");
  };

  const removeCategory = (category: string) => {
    onChange(categories.filter((existing) => existing !== category));
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => setOpen(true)}
        className="flex flex-wrap items-center gap-1.5 rounded-sm border border-sand-300 bg-[var(--reader-surface)] px-2.5 py-2 transition-colors focus-within:border-brand-400"
      >
        {categories.map((category) => (
          <span
            key={category}
            className="inline-flex items-center gap-1 rounded-full bg-brand-500/10 py-1 pl-2.5 pr-1.5 text-[11px] font-semibold text-brand-600"
          >
            {category}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                removeCategory(category);
              }}
              aria-label={`Remove ${category}`}
              className="inline-flex items-center justify-center rounded-full p-0.5 text-brand-600/70 hover:bg-brand-500/20 hover:text-brand-600"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && query === "" && categories.length > 0) {
              removeCategory(categories[categories.length - 1]);
            } else if (event.key === "Enter" && suggestions[0]) {
              event.preventDefault();
              addCategory(suggestions[0]);
            }
          }}
          placeholder={categories.length === 0 ? "Add a category…" : ""}
          className="min-w-[10ch] flex-1 bg-transparent p-0.5 text-[12px] font-medium text-[var(--reader-text)] outline-none"
        />
      </div>

      {open && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-sm border border-sand-300 bg-[var(--reader-surface)] py-1 shadow-lg">
          {suggestions.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => addCategory(category)}
              className="block w-full px-3 py-2 text-left text-[12px] font-medium text-[var(--reader-text)] hover:bg-[var(--reader-surface-hover)]"
            >
              {category}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
