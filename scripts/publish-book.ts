#!/usr/bin/env bun
// Pushes a locally-ingested/narrated book to Supabase Storage. Ingestion and
// audio generation keep writing to content/books/ + public/ exactly as
// before — this is the separate "make it live" step, run once a book's
// content and narration have been reviewed locally.
//
// Usage:
//   bun run publish:book --book <slug>
//   bun run publish:book --book all
//
// The published JSON is not a copy of the local file: every metadata.cover,
// image passage src, and section audio src is rewritten to an absolute
// Supabase CDN URL before upload, so the local file (relative paths, read by
// the local dev server/admin preview) and the published file (self-contained
// CDN URLs, read by BOOKS_SOURCE=supabase) can differ without either needing
// separate code paths downstream — NarrationEngine, <img> tags, etc. just
// consume whatever src string is already in the doc.
import path from "node:path";
import { readFile } from "node:fs/promises";
import { getLocalBookDocument, listLocalBookSlugs } from "@/lib/book/repository";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { STORAGE_BUCKET, storagePublicUrl } from "@/lib/storage/config";
import { flattenSections } from "@/lib/search/bookIndex";
import { sectionLabel } from "@/lib/reader/sectionHeading";
import type { BookDocument, Section } from "@/lib/book/schema";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const CONTENT_DIR = path.join(process.cwd(), "content", "books");

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp3": "audio/mpeg",
};

// The `materials.toc` shape (models-spec.md § materials / api-spec.md's TocSection) —
// pruned section tree: resolved label + passage count, no passage content.
type TocSection = {
  id: string;
  label: string | null;
  kind: Section["kind"];
  passageCount: number;
  children: TocSection[];
  audioDurationMs?: number;
  narratorIds?: string[];
};

function buildToc(sections: Section[]): TocSection[] {
  return sections.map((section) => {
    const track = section.audio?.narratorTracks[0];
    return {
      id: section.id,
      label: sectionLabel(section),
      kind: section.kind,
      passageCount: section.passages.length,
      children: buildToc(section.children),
      ...(track ? { audioDurationMs: track.durationMs } : {}),
      ...(section.audio ? { narratorIds: section.audio.narratorTracks.map((t) => t.narratorId) } : {}),
    };
  });
}

function collectTocTitles(toc: TocSection[]): string {
  const labels: string[] = [];
  const walk = (nodes: TocSection[]) => {
    for (const node of nodes) {
      if (node.label) labels.push(node.label);
      walk(node.children);
    }
  };
  walk(toc);
  return labels.join(" ");
}

// Populates the `materials` row alongside the Storage upload above — this is
// what actually makes a published book show up via the Materials API
// (models-spec.md § materials). Upserts on `slug` so a republish keeps the
// same `id` rather than minting a new row every time.
async function upsertMaterialRow(published: BookDocument, jsonObjectPath: string) {
  const toc = buildToc(published.sections);
  const { error } = await getSupabaseAdminClient()
    .from("materials")
    .upsert(
      {
        slug: published.slug,
        title: published.metadata.title,
        author: published.metadata.author,
        description: published.metadata.description,
        cover_url: published.metadata.cover,
        language: published.metadata.language,
        published_year: published.metadata.publishedYear ?? null,
        page_count_estimate: published.metadata.pageCountEstimate ?? null,
        narrator_count: published.narrators.length,
        toc,
        toc_titles: collectTocTitles(toc),
        spine: published.spine,
        json_storage_path: jsonObjectPath,
        status: "published",
      },
      { onConflict: "slug" }
    );
  if (error) throw new Error(`materials upsert for ${published.slug} failed: ${error.message}`);
  console.log(`  materials row -> slug=${published.slug}`);
}

async function uploadFile(localPath: string, objectPath: string, cacheControl: string) {
  const bytes = await readFile(localPath);
  const contentType = CONTENT_TYPES[path.extname(localPath).toLowerCase()] ?? "application/octet-stream";
  const { error } = await getSupabaseAdminClient()
    .storage.from(STORAGE_BUCKET)
    .upload(objectPath, bytes, { contentType, cacheControl, upsert: true });
  if (error) throw new Error(`upload ${objectPath} failed: ${error.message}`);
}

async function publishBook(slug: string) {
  const book = await getLocalBookDocument(slug);
  const published: BookDocument = structuredClone(book);

  // Cover
  const coverExt = path.extname(book.metadata.cover);
  const coverObjectPath = `covers/${slug}${coverExt}`;
  await uploadFile(path.join(PUBLIC_DIR, book.metadata.cover), coverObjectPath, "public, max-age=31536000, immutable");
  published.metadata.cover = storagePublicUrl(coverObjectPath);
  console.log(`  cover -> ${coverObjectPath}`);

  // Chapter images + audio, walked once over the flattened section tree.
  // Rewrites happen in place on `published` (a structuredClone of the local
  // doc), so checking for an existing track before mutating its src is safe.
  for (const section of flattenSections(published.sections)) {
    for (const passage of section.passages) {
      if (passage.type !== "image" || !passage.src) continue;
      const objectPath = passage.src.replace(/^\//, ""); // "/images/<slug>/<file>" -> "images/<slug>/<file>"
      await uploadFile(path.join(PUBLIC_DIR, passage.src), objectPath, "public, max-age=31536000, immutable");
      passage.src = storagePublicUrl(objectPath);
      console.log(`  image -> ${objectPath}`);
    }

    const track = section.audio?.narratorTracks[0];
    if (!track) continue;
    const objectPath = `audio/${slug}/${section.id}.mp3`;
    await uploadFile(path.join(CONTENT_DIR, slug, "audiobooks", `${section.id}.mp3`), objectPath, "public, max-age=31536000, immutable");
    track.src = storagePublicUrl(objectPath);
    console.log(`  audio -> ${objectPath}`);
  }

  // Book JSON last, so it only goes live once every asset it points to exists
  const jsonObjectPath = `books/${slug}.json`;
  const { error } = await getSupabaseAdminClient()
    .storage.from(STORAGE_BUCKET)
    .upload(jsonObjectPath, JSON.stringify(published, null, 2), {
      contentType: "application/json",
      cacheControl: "public, max-age=300",
      upsert: true,
    });
  if (error) throw new Error(`upload ${jsonObjectPath} failed: ${error.message}`);
  console.log(`  json -> ${jsonObjectPath}`);

  await upsertMaterialRow(published, jsonObjectPath);
}

// listBooks() in supabase mode reads this instead of doing a Storage API
// list() call, which needs a key even for a public bucket — this way the
// running app never needs any Supabase credentials, only fetch().
async function updateIndex(publishedSlugs: string[]) {
  const indexObjectPath = "books/index.json";
  let existing: string[] = [];
  try {
    const res = await fetch(storagePublicUrl(indexObjectPath));
    if (res.ok) existing = (await res.json()) as string[];
  } catch {
    // first publish ever — no existing index yet
  }
  const merged = Array.from(new Set([...existing, ...publishedSlugs])).sort();
  const { error } = await getSupabaseAdminClient()
    .storage.from(STORAGE_BUCKET)
    .upload(indexObjectPath, JSON.stringify(merged, null, 2), {
      contentType: "application/json",
      cacheControl: "public, max-age=300",
      upsert: true,
    });
  if (error) throw new Error(`upload ${indexObjectPath} failed: ${error.message}`);
}

function parseArgs(argv: string[]) {
  const args: { book?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--book") args.book = argv[++i];
  }
  return args;
}

async function main() {
  const { book } = parseArgs(process.argv.slice(2));
  if (!book) {
    console.error("Usage: bun run publish:book --book <slug|all>");
    process.exit(1);
  }

  const slugs = book === "all" ? await listLocalBookSlugs() : [book];
  const published: string[] = [];

  for (const slug of slugs) {
    console.log(`\n${slug}`);
    try {
      await publishBook(slug);
      published.push(slug);
    } catch (err) {
      console.error(`  failed: ${(err as Error).message}`);
    }
  }

  if (published.length > 0) {
    await updateIndex(published);
    console.log(`\nindex updated: ${published.join(", ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
