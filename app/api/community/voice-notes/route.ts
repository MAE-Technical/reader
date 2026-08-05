import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { getAuthenticatedReader } from "@/lib/auth/session";
import { unauthorized, validationError } from "@/lib/api/errors";
import { bucketPublicUrl } from "@/lib/storage/config";

const VOICE_NOTES_BUCKET = "voice-notes";

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/x-m4a": "m4a",
  "audio/mpeg": "mp3",
};

export async function POST(request: Request) {
  const reader = await getAuthenticatedReader(request);
  if (!reader) return unauthorized();

  const contentType = request.headers.get("content-type") ?? "";
  const ext = EXTENSION_BY_CONTENT_TYPE[contentType];
  if (!ext) return validationError("Unsupported audio Content-Type.", "audio");

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength === 0) return validationError("Empty audio upload.", "audio");

  const objectPath = `${randomUUID()}.${ext}`;
  const { error } = await getSupabaseAdminClient()
    .storage.from(VOICE_NOTES_BUCKET)
    .upload(objectPath, bytes, { contentType, upsert: false });

  if (error) return validationError("Could not upload voice note.");
  return NextResponse.json({ url: bucketPublicUrl(VOICE_NOTES_BUCKET, objectPath) }, { status: 201 });
}
