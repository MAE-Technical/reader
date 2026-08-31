import { NextResponse } from "next/server";
import { getAuthenticatedReader } from "@/lib/auth/session";
import { getReaderProfilePage, ReaderNotFoundError } from "@/lib/reader/profile";
import { notFound } from "@/lib/api/errors";

/**
 * `GET /api/readers/{slug}` — a reader's public dossier (identity, stats,
 * currently reading, public notes), plus their own private highlights when
 * the caller's own bearer token resolves to that same reader (see
 * getReaderProfilePage's `isSelf`). No 401 for a missing/invalid token —
 * unlike most `/api/auth/me/*` routes, this one is public by default; an
 * absent viewer just means `isSelf` comes back false and `highlights` null.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const viewer = await getAuthenticatedReader(request);

  try {
    const page = await getReaderProfilePage(slug, viewer?.readerId);
    return NextResponse.json(page);
  } catch (err) {
    if (err instanceof ReaderNotFoundError) return notFound("No reader found for that profile.");
    throw err;
  }
}
