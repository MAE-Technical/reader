import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Reader from "@/app/components/reader/Reader";
import { getBookDocumentFromMaterial, MaterialNotFoundError } from "@/lib/materials/toBookDocument";
import { getMaterialDetail } from "@/lib/materials/detail";
import { PLATFORM_NAME } from "@/lib/config/platform";

// Deliberately uses the cheap DB-only getMaterialDetail rather than
// getBookDocumentFromMaterial (which pulls the full Section[] tree,
// including a Storage read for every passage) — a <title>/description tag
// only ever needs metadata, never the book's actual text.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let material;
  try {
    material = await getMaterialDetail(slug);
  } catch {
    return { title: "Book not found" };
  }
  const { title, author, description } = material;
  const desc = description || `${title} by ${author} — read or listen on ${PLATFORM_NAME}.`;
  return { title, description: desc };
}

export default async function ReadBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  // ?section=<sectionId> — set by the book-detail page's chapter links
  // (app/(app)/book/[slug]) to jump straight to that chapter on this one
  // load, without touching the reader's own saved resume position.
  // ?passage=<passageId>&note=<annotationId> — set by the home community
  // feed's cards, narrowing that further to one exact passage and
  // (optionally, paired with it) opening that annotation's thread once
  // the reader has landed.
  // ?listen=1 — set by the book-detail page's own Listen button, which now
  // reaches this page via a real navigation (see its own hardNavigate
  // comment) rather than the router.push+openBook() it used when this was
  // a soft one — this is how it hands that intent off instead.
  searchParams: Promise<{ section?: string; passage?: string; note?: string; listen?: string }>;
}) {
  const { slug } = await params;
  const { section, passage, note, listen } = await searchParams;

  let book, materialId;
  try {
    ({ book, materialId } = await getBookDocumentFromMaterial(slug));
  } catch (err) {
    if (err instanceof MaterialNotFoundError) {
      notFound();
    }
    // Schema/parse errors and anything unexpected surface through error.tsx
    throw err;
  }
  return (
    <Reader
      book={book}
      materialId={materialId}
      targetSectionId={section}
      targetPassageId={passage}
      targetNoteId={note}
      autoListen={listen === "1"}
    />
  );
}
