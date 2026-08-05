"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import type { BookDocument } from "@/lib/book/schema";
import { useMaterialsSearch } from "@/lib/materials/useMaterialsSearch";
import { buildBookIndex, searchBook, type SearchResult } from "@/lib/search/bookIndex";

function highlight(text: string, q: string) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark
        style={{ background: "var(--reader-highlight)" }}
        className="text-inherit rounded-[2px]"
      >
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

type Props = {
  /** Omitted on the home page, which has no single book in scope — see the
   * library-wide branch below. Every in-reader call site (Reader.tsx) still
   * passes this, keeping that book-scoped passage search unchanged. */
  book?: BookDocument;
  currentSectionId?: string;
  onNavigate?: (sectionId: string, passageId: string) => void;
  onClose?: () => void;
};

export default function SearchModal({ book, currentSectionId, onNavigate, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "chapter" | "notes" | "discourse">("all");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Book-scoped passage search (in-reader only) vs. library-wide book
  // search (home page only) — mutually exclusive, gated on whether a
  // `book` was actually passed in. buildBookIndex/searchBook below are
  // no-ops (never called) whenever `book` is undefined.
  const index = useMemo(() => (book ? buildBookIndex(book) : null), [book]);
  const allResults = useMemo(() => (index ? searchBook(index, query) : []), [index, query]);
  const chapterResults = useMemo(
    () => allResults.filter((r) => r.sectionId === currentSectionId),
    [allResults, currentSectionId]
  );
  const { results: libraryResults, isSearching } = useMaterialsSearch(book ? "" : query, { limit: 20 });
  // Notes and cross-reader discourse aren't backed by real data yet — this
  // only searches the book itself, per reader.md's MVP search scope.
  const notesResults: SearchResult[] = [];
  const discourseResults: SearchResult[] = [];

  const counts = {
    all: allResults.length,
    chapter: chapterResults.length,
    notes: notesResults.length,
    discourse: discourseResults.length,
  };

  const resultsByTab: Record<typeof activeTab, SearchResult[]> = {
    all: allResults,
    chapter: chapterResults,
    notes: notesResults,
    discourse: discourseResults,
  };
  const filtered = resultsByTab[activeTab];

  const tabs: { id: typeof activeTab; label: string }[] = [
    { id: "all", label: `All (${counts.all})` },
    { id: "chapter", label: `In this chapter (${counts.chapter})` },
    { id: "notes", label: `Notes (${counts.notes})` },
    { id: "discourse", label: `Discourse (${counts.discourse})` },
  ];

  return (
    <div
      className={`w-full h-full box-border bg-black/45 flex justify-center ${
        isMobile ? "items-stretch p-0" : "items-start py-16 px-6"
      }`}
    >
      <div
        className={`w-full bg-[var(--reader-surface)] shadow-lg flex flex-col box-border overflow-hidden ${
          isMobile ? "h-full rounded-none" : "max-w-[640px] h-[640px] rounded-lg"
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[var(--reader-border)] flex-none">
          <Search size={18} className="text-[var(--reader-text-muted)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={book ? "Search this book..." : "Search for a book"}
            className="flex-1 border-none outline-none text-[14px] font-medium text-[var(--reader-text)] bg-transparent"
          />
          {query && (
            <span
              onClick={() => setQuery("")}
              className="cursor-pointer text-[var(--reader-text-muted)]"
            >
              <X size={16} />
            </span>
          )}
          <span
            onClick={onClose}
            className="cursor-pointer text-sm font-medium text-[var(--reader-text-muted)] whitespace-nowrap"
          >
            {isMobile ? "Cancel" : "Close"}
          </span>
        </div>

        {book && (
          <div className="flex gap-2 px-5 py-3 border-b border-[var(--reader-border)] flex-none overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-none py-1.5 px-3.5 rounded-full border text-sm font-medium whitespace-nowrap cursor-pointer ${
                  activeTab === t.id
                    ? "bg-brand-500 text-white border-brand-500"
                    : "bg-transparent text-[var(--reader-text)] border-[var(--reader-border)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="om-scroll flex-1 overflow-y-auto px-5 py-4">
          {book ? (
            <>
              {filtered.map((r) => (
                <div
                  key={r.passageId}
                  onClick={() => {
                    onNavigate?.(r.sectionId, r.passageId);
                    onClose?.();
                  }}
                  className="py-3 border-b border-[var(--reader-border)] cursor-pointer"
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-[var(--reader-text)]">
                      {book.metadata.title}
                    </span>
                    <span className="text-sm text-[var(--reader-text-muted)]">— {book.metadata.author}</span>
                  </div>
                  <div className="text-xs font-medium text-[var(--reader-text-muted)] my-0.5 mb-1.5">
                    {r.sectionTitle}
                  </div>
                  <span className="text-[15px] leading-[1.65] font-serif text-[var(--reader-text)]">
                    {highlight(r.text, query)}
                  </span>
                </div>
              ))}
              {query.trim() && filtered.length === 0 && (
                <p className="text-sm text-[var(--reader-text-muted)] text-center py-10">
                  No results for &ldquo;{query}&rdquo;.
                </p>
              )}
            </>
          ) : (
            <>
              {libraryResults.map((material) => (
                <Link
                  key={material.id}
                  href={`/book/${material.slug}`}
                  onClick={() => onClose?.()}
                  className="flex items-center gap-3 py-3 border-b border-[var(--reader-border)] no-underline"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={material.cover ?? ""}
                    alt={material.title}
                    className="h-14 w-11 flex-none rounded-sm border border-[var(--reader-border)] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[var(--reader-text)]">
                      {highlight(material.title, query)}
                    </div>
                    <div className="truncate text-xs font-medium text-[var(--reader-text-muted)]">
                      {highlight(material.author, query)}
                    </div>
                  </div>
                </Link>
              ))}
              {!isSearching && query.trim() && libraryResults.length === 0 && (
                <p className="text-sm text-[var(--reader-text-muted)] text-center py-10">
                  No results for &ldquo;{query}&rdquo;.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
