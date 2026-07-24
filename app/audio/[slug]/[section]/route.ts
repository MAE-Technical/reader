import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import type { NextRequest } from "next/server";

// Audio lives alongside its book's JSON under content/books, not in public/,
// so it's not statically served — this route is what public/'s static
// handler would otherwise have done for free, including Range support
// (without it, the reader's scrub bar would have to download a whole
// multi-MB section just to seek).
const AUDIO_DIR = path.join(process.cwd(), "content", "books");
const SAFE_SLUG = /^[a-zA-Z0-9_-]+$/;
const SAFE_FILE = /^[a-zA-Z0-9_-]+\.mp3$/;

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string; section: string }> }) {
  const { slug, section } = await params;
  if (!SAFE_SLUG.test(slug) || !SAFE_FILE.test(section)) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(AUDIO_DIR, slug, "audiobooks", section);
  let size: number;
  try {
    size = (await stat(filePath)).size;
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const headers = {
    "Content-Type": "audio/mpeg",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=86400",
  };

  const range = req.headers.get("range");
  if (!range) {
    return new Response(Readable.toWeb(createReadStream(filePath)) as unknown as ReadableStream, {
      headers: { ...headers, "Content-Length": String(size) },
    });
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match || (!match[1] && !match[2])) return new Response("Invalid Range", { status: 416 });
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : size - 1;
  if (start > end || end >= size) {
    return new Response("Invalid Range", { status: 416, headers: { "Content-Range": `bytes */${size}` } });
  }

  return new Response(Readable.toWeb(createReadStream(filePath, { start, end })) as unknown as ReadableStream, {
    status: 206,
    headers: {
      ...headers,
      "Content-Length": String(end - start + 1),
      "Content-Range": `bytes ${start}-${end}/${size}`,
    },
  });
}
