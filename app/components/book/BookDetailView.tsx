"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Headphones, Play } from "lucide-react";
import type { MaterialDetail } from "@/lib/materials/detail";
import { useReadingPositionStore } from "@/stores/reading-position-store";
import { useContinueReading } from "@/lib/auth/useContinueReading";
import { useBookCommunityNotes } from "@/lib/materials/useBookCommunityNotes";
import BookCover from "@/app/components/shared/BookCover";
import { resolveBookCoverSrc } from "@/lib/materials/image";
import BookNoteCard from "./BookNoteCard";
import ShareButton from "./ShareButton";
import ReaderLink from "../ReaderLink";

type Tab = "outline" | "notes";
const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: "outline", label: "Table of content" },
  { value: "notes", label: "Community notes" },
];

/** The two tabs read as a direct continuation of the metadata block above —
 * an underline bar sharing that block's own bottom border, not a separate
 * floating pill control — so the whole header (cover through tabs) reads as
 * one fused unit, the way a profile page's own tab bar sits flush under its
 * bio. Brand-rust is reserved for "Start reading" just above this; the
 * active tab gets the reader's own ink color instead, so the two controls
 * never compete for the same accent. */
function TabBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <div className="mb-6 flex gap-6 border-b border-[var(--reader-border)]">
      {TAB_OPTIONS.map((opt) => {
        const active = opt.value === tab;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`-mb-px cursor-pointer border-b-2 bg-transparent px-0.5 pb-3 text-sm font-semibold transition-colors ${
              active
                ? "border-[var(--reader-text)] text-[var(--reader-text)]"
                : "border-transparent text-[var(--reader-text-subtle)] hover:text-[var(--reader-text-muted)]"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The community-notes tab's layout — two independent flex-col stacks
 * (left/right) in row-major reading order (card 1 left, card 2 right, card
 * 3 left, ...), not a CSS grid.
 *
 * A grid was the first version, and broke visibly once a book had more than
 * a couple of notes: a grid's rows are *shared* tracks — even with
 * `items-start` (which only stops the *shorter* cell in a row from
 * stretching to fill it), the row's own height is still set by its tallest
 * cell. A note card's height depends entirely on how much a reader wrote
 * and how long its reply thread is, so neighboring cells in the same row
 * routinely differ wildly — and the shorter column ends up with a
 * mismatched, content-dependent gap under each such card instead of a
 * uniform one. Two self-contained flex-col stacks remove the row coupling
 * entirely — each column's own gap is always exactly gap-5.
 *
 * Not CSS multi-column masonry (`columns-2`) either: masonry fills the
 * *entire first column* before spilling into the second, which for a
 * handful of unevenly-sized cards crams nearly everything into one column
 * and leaves the other almost empty. Alternating by index instead always
 * keeps cards in reading order across the row — for an odd card count, the
 * leftover lands in the left column, the same position every other row's
 * first card already has.
 *
 * Rendered as two full DOM trees, one hidden per breakpoint, rather than
 * one structure reflowed by CSS — the same swap AppBottomNav/AppSidebar
 * already do for the app shell itself. The single mobile column
 * (0,1,2,3,...) and the two desktop columns (evens down the left, odds
 * down the right) are genuinely different shapes; no CSS variant can
 * retarget that on its own.
 */
function CardGrid<T>({
  items,
  keyOf,
  children,
}: {
  items: T[];
  keyOf: (item: T, index: number) => React.Key;
  children: (item: T, index: number) => React.ReactNode;
}) {
  const columns = [items.filter((_, i) => i % 2 === 0), items.filter((_, i) => i % 2 === 1)];

  return (
    <>
      <div className="flex flex-col gap-5 shell:hidden">
        {items.map((item, i) => (
          <div key={keyOf(item, i)}>{children(item, i)}</div>
        ))}
      </div>
      <div className="hidden shell:flex shell:items-start shell:gap-5">
        {columns.map((column, colIndex) => (
          <div key={colIndex} className="flex min-w-0 flex-1 flex-col gap-5">
            {column.map((item, i) => {
              const index = i * 2 + colIndex;
              return <div key={keyOf(item, index)}>{children(item, index)}</div>;
            })}
          </div>
        ))}
      </div>
    </>
  );
}

type TocOutlineNode = {
  title: string | null;
  section: MaterialDetail["sections"][number] | null;
  children: TocOutlineNode[];
};

function hasRenderableTocTitleNode(node: MaterialDetail["tocTitles"][number]): boolean {
  return (node.title !== null && node.title.trim().length > 0) || node.children.some(hasRenderableTocTitleNode);
}

function hasRenderableTocTitleNodes(nodes: MaterialDetail["tocTitles"]): boolean {
  return nodes.some(hasRenderableTocTitleNode);
}

function mergeTocTrees(
  titles: MaterialDetail["tocTitles"],
  sections: MaterialDetail["sections"]
): TocOutlineNode[] {
  return titles.map((titleNode, index) => {
    const section = sections[index] ?? null;
    return {
      title: titleNode.title,
      section,
      children: mergeTocTrees(titleNode.children, section?.children ?? []),
    };
  });
}

function TocTree({
  nodes,
  slug,
  depth = 0,
}: {
  nodes: TocOutlineNode[];
  slug: string;
  depth?: number;
}) {
  const rendered = nodes
    .map((node, index) => ({ node, key: `${depth}-${index}` }))
    .filter(({ node }) => (node.title !== null && node.title.trim().length > 0) || node.children.some(hasRenderableTocTitleNode));

  if (rendered.length === 0) return null;

  return (
    <div
      className={
        depth === 0
          ? "flex flex-col divide-y divide-[var(--reader-border)]"
          : "mt-2 flex flex-col divide-y divide-[var(--reader-border)] pl-5"
      }
    >
      {rendered.map(({ node, key }) => (
        <TocNode key={key} node={node} slug={slug} depth={depth} />
      ))}
    </div>
  );
}

function TocNode({ node, slug, depth }: { node: TocOutlineNode; slug: string; depth: number }) {
  const hasTitle = node.title !== null && node.title.trim().length > 0;
  const hasChildren = node.children.length > 0;
  const hasLinkTarget = node.section !== null && !hasChildren && hasTitle;

  if (!hasTitle && !hasChildren) return null;

  if (hasChildren) {
    return (
      <div className="py-3 first:pt-0">
        {hasTitle && (
          <div
            className="mb-2 text-[13.5px] font-semibold text-[var(--reader-text)]"
          >
            {node.title}
          </div>
        )}
        <TocTree nodes={node.children} slug={slug} depth={depth + 1} />
      </div>
    );
  }

  if (!hasLinkTarget || !node.section) {
    return (
      <div className="py-2.5 first:pt-0">
        <span className="truncate text-[13.5px] font-medium text-[var(--reader-text-muted)]">{node.title}</span>
      </div>
    );
  }

  return (
    <ReaderLink
      href={`/read/${slug}?section=${node.section.id}`}
      className="group flex w-full items-center gap-3 px-1 py-2.5 no-underline transition-colors hover:bg-[var(--reader-surface-hover)]"
    >
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-[var(--reader-text-muted)] transition-colors group-hover:text-[var(--reader-text)]">
        {node.title}
      </span>
      <ChevronRight
        size={14}
        className="flex-none text-[var(--reader-text-subtle)] transition-colors group-hover:text-[var(--reader-text-muted)] group-hover:translate-x-0.5"
      />
    </ReaderLink>
  );
}

function OutlineTab({ material }: { material: MaterialDetail }) {
  if (!hasRenderableTocTitleNodes(material.tocTitles)) return null;
  const outline = mergeTocTrees(material.tocTitles, material.sections);

  return (
    <div className="rounded-sm border border-[var(--reader-border)] bg-[var(--reader-surface)] p-4">
      <TocTree nodes={outline} slug={material.slug} />
    </div>
  );
}

function NotesTab({ materialId }: { materialId: string }) {
  // No sort toggle here — "top" (highest-reacted first) is the one useful
  // default for a book-scoped feed this size; a Top/Recent switch was
  // redundant weight next to the outline/notes tab switch directly above it.
  const { data, isLoading } = useBookCommunityNotes(materialId, "top");
  const items = data?.items ?? [];

  if (isLoading) {
    return <p className="mt-1 mb-0 font-literata text-sm text-[var(--reader-text-muted)]">Loading notes…</p>;
  }
  if (items.length === 0) {
    return (
      <p className="mt-1 mb-0 font-literata text-sm text-[var(--reader-text-muted)]">
        No community notes on this book yet — be the first to highlight a passage and share your thoughts.
      </p>
    );
  }

  return (
    <CardGrid items={items} keyOf={(item) => item.note.id}>
      {(item) => <BookNoteCard materialId={materialId} item={item} />}
    </CardGrid>
  );
}

/** Published year / page count / audiobook availability, as a single
 * dot-separated byline rather than a row of bordered chips — a book's
 * facts read as editorial metadata (the way a magazine masthead or a
 * library catalog card sets them), not as UI controls, which is what a
 * bordered pill implied even with no fill. Audiobook gets a small
 * brand-colored accent (icon + word) as the one deliberate point of color
 * in an otherwise quiet, all-text line — everything else stays plain. */
function MetaLine({ material, hasNarration }: { material: MaterialDetail; hasNarration: boolean }) {
  const parts: { key: string; node: React.ReactNode }[] = [];
  if (material.publishedYear) parts.push({ key: "year", node: <span>{material.publishedYear}</span> });
  if (material.pageCountEstimate) parts.push({ key: "pages", node: <span>{material.pageCountEstimate} pages</span> });
  if (hasNarration) {
    parts.push({
      key: "audio",
      node: (
        <span className="inline-flex items-center gap-1 text-brand-500">
          <Headphones size={12} />
          Audiobook
        </span>
      ),
    });
  }
  if (parts.length === 0) return null;

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-x-2 text-[13px] font-medium text-[var(--reader-text-subtle)]">
      {parts.map((part, i) => (
        <span key={part.key} className="inline-flex items-center gap-2">
          {i > 0 && <span aria-hidden="true">·</span>}
          {part.node}
        </span>
      ))}
    </div>
  );
}

/**
 * A book's "profile page": cover, title/author/facts/progress/CTAs sitting
 * directly on the page background (no card, no backdrop panel behind it —
 * the cover art itself already carries the visual interest), an underline
 * tab bar fused directly beneath it (sharing its own bottom border as the
 * one seam in the whole header), then the selected tab's content — the
 * book's outline, or every community note on it. This is the one page a
 * reader is likeliest to land on cold from a shared link, so the whole
 * header reads as one deliberate, continuous unit rather than a stack of
 * separately-boxed widgets.
 *
 * The two tabs deliberately don't share one layout: the outline is a single
 * document (one flowing list, see OutlineTab), while notes are a feed of
 * independent posts (a card grid, see CardGrid) — each gets the shape that
 * actually matches what it is, rather than forcing both into one mold for
 * its own sake.
 *
 * Served entirely from `materials.detail`'s DB-only fields (api-spec.md's
 * own worked example for this exact page) — no `BookDocument`, no Storage
 * round trip for the hero/outline. The notes tab's own fetch
 * (useBookCommunityNotes) is the one thing on this page that does touch
 * Storage (for each note's quoted excerpt), and only once that tab is
 * actually selected.
 */
export default function BookDetailView({ material }: { material: MaterialDetail }) {
  // Ensures the position mirror is populated even for a reader who lands
  // straight on this page (a shared link, a search-engine hit) without ever
  // visiting /home first — see useContinueReading's own hydration effect.
  // The returned list itself isn't needed here, only its side effect.
  useContinueReading();
  const pct = Math.round(useReadingPositionStore((s) => s.progressPercentByMaterial[material.id] ?? 0));
  const position = useReadingPositionStore((s) => s.positions[material.id]);
  const [tab, setTab] = useState<Tab>("outline");

  const hasNarration = material.narratorCount > 0;
  // `position` is one shared resume record for both reading and listening
  // (see stores/reading-position-store.ts's Position type) — reading never
  // writes `audioTimeMs`, only NarrationEngine does (always, even at 0ms
  // when playback starts), so its presence is what actually distinguishes
  // "has listened before" from "has only ever read this book."
  const hasListened = position?.audioTimeMs !== undefined;

  return (
    <div className="pb-12 shell:mx-auto shell:max-w-4xl">
      <div className="flex items-center gap-3 py-3.5">
        <Link
          href="/library"
          aria-label="Back to library"
          className="flex h-9 w-9 flex-none items-center justify-center rounded-md border border-[var(--reader-border)] text-[var(--reader-text)] no-underline transition-colors hover:bg-[var(--reader-surface-hover)]"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="ml-auto">
          <ShareButton title={material.title} text={`${material.title} by ${material.author}`} />
        </div>
      </div>

      <div className="mb-8 flex flex-col items-start gap-5 shell:flex-row shell:items-center shell:gap-9">
        {/* A compact, contained thumbnail rather than a full-bleed hero —
            edge-to-edge previously made the cover roughly half the screen
            and put it visibly out of step with everything else on the
            page, since the back row and all the text below sit
            flush left inside the normal page padding while the cover
            escaped it via negative margins. No auto margin here either,
            for the same reason: the cover is the container's first flex
            item, so it lines up flush left with everything below it
            instead of floating centered on its own. */}
        <BookCover
          src={resolveBookCoverSrc(material)}
          alt={material.title}
          className="aspect-[2/3] w-48 shell:w-48 flex-none shadow-lg"
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-2xl font-semibold leading-tight text-[var(--reader-text)] shell:text-4xl">
            {material.title}
          </h1>
          <div className="mt-2 text-base font-medium text-[var(--reader-text-muted)]">{material.author}</div>

          <MetaLine material={material} hasNarration={hasNarration} />

          {material.googleDescription && (
            <p className="mt-4 text-sm font-medium leading-6 text-[var(--reader-text-muted)]">
              {material.googleDescription}
            </p>
          )}

          {pct > 0 && (
            <div className="mt-4 flex items-center gap-3">
              {/* --reader-surface is literally the same value as --reader-bg
                  in both themes (see globals.css) — invisible as a track
                  color now that this hero sits directly on the page
                  background rather than its own tinted panel.
                  --reader-surface-hover is the token actually built to read
                  as a filled element against a flat bg in either theme. */}
              <div className="h-1 max-w-64 flex-1 overflow-hidden rounded-full bg-[var(--reader-surface-hover)]">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
              </div>
              <span className="flex-none text-xs font-semibold text-[var(--reader-text-muted)]">{pct}% complete</span>
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 shell:flex-row">
            <ReaderLink
              href={`/read/${material.slug}`}
              className="rounded-sm bg-brand-500 px-6 py-2.5 text-center text-sm font-semibold text-white no-underline shell:w-auto hover:bg-brand-600"
            >
              {pct > 0 ? "Resume reading" : "Start reading"}
            </ReaderLink>

            {hasNarration && (
              // ?listen=1 rather than calling openBook(book) directly —
              // this is a real navigation (ReaderLink), and audio-store's
              // `book` field isn't persisted (only `speed` is), so
              // setting it before the page unloads would just lose it.
              // Reader.tsx picks the flag up on mount and calls openBook
              // itself instead, the same handoff targetSectionId/
              // targetPassageId already do for "jump to this chapter"/
              // "open this note" links.
              <ReaderLink
                href={`/read/${material.slug}?listen=1`}
                className="flex items-center cursor-pointer justify-center gap-2 rounded-sm border border-[var(--reader-border)] bg-transparent px-6 py-2.5 text-sm font-semibold text-[var(--reader-text)] no-underline shell:w-auto hover:bg-[var(--reader-surface)]"
              >
                <Play size={16} />
                {hasListened ? "Continue playing" : "Listen (audiobook)"}
              </ReaderLink>
            )}
          </div>
        </div>
      </div>

      <TabBar tab={tab} onChange={setTab} />

      {tab === "outline" ? <OutlineTab material={material} /> : <NotesTab materialId={material.id} />}
    </div>
  );
}
