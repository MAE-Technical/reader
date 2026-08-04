import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Rudimentary local-file storage for recorded voice notes, same pattern as
// app/api/library-data (data/ on disk, swappable for real object storage
// later without callers changing) — kept as raw files rather than inlined
// into library.json's own JSON blob since that's read/written whole on
// every save and audio doesn't belong bloating it.
const VOICE_NOTES_DIR = path.join(process.cwd(), "data", "voice-notes");

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
};

// Recorder's own mimeType often carries a codec parameter (e.g.
// "audio/webm;codecs=opus") — only the base type before ';' picks the
// extension/served Content-Type; the rest is meaningless for storage.
function baseContentType(contentType: string): string {
  return contentType.split(";")[0].trim();
}

export async function POST(request: Request) {
  const contentType = baseContentType(request.headers.get("content-type") ?? "");
  const ext = EXT_BY_CONTENT_TYPE[contentType] ?? "webm";
  const bytes = Buffer.from(await request.arrayBuffer());
  if (bytes.length === 0) return new Response("Empty body", { status: 400 });

  await mkdir(VOICE_NOTES_DIR, { recursive: true });
  const filename = `${crypto.randomUUID()}.${ext}`;
  await writeFile(path.join(VOICE_NOTES_DIR, filename), bytes);

  return Response.json({ url: `/voice-notes/${filename}` });
}
