import { readFile } from "node:fs/promises";
import path from "node:path";
import type { NextRequest } from "next/server";

// Serves what app/api/voice-notes wrote — not under public/, so it's not
// statically served for free the way public/ assets are; this route is
// what that would otherwise have done. No Range support (unlike
// app/audio/[slug]/[section]'s narration files) — these are short voice
// memos, not multi-minute audiobook sections, so seeking a whole small
// file back down from the start costs nothing worth the extra complexity.
const VOICE_NOTES_DIR = path.join(process.cwd(), "data", "voice-notes");
const SAFE_FILE = /^[a-zA-Z0-9-]+\.(webm|ogg|mp4|m4a|mp3)$/;

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  webm: "audio/webm",
  ogg: "audio/ogg",
  mp4: "audio/mp4",
  m4a: "audio/mp4",
  mp3: "audio/mpeg",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  if (!SAFE_FILE.test(file)) return new Response("Not found", { status: 404 });

  let data: Buffer;
  try {
    data = await readFile(path.join(VOICE_NOTES_DIR, file));
  } catch {
    return new Response("Not found", { status: 404 });
  }

  const ext = file.split(".").pop()!;
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": CONTENT_TYPE_BY_EXT[ext],
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
