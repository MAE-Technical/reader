import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { getAuthenticatedReader } from "@/lib/auth/session";
import { unauthorized, validationError } from "@/lib/api/errors";
import { getReaderRow } from "@/lib/auth/profile";
import type { CurrentReadingEntry } from "@/lib/api/types";

type Body = {
  materialId?: string;
  sectionId?: string;
  passageIndex?: number;
  audioTimeMs?: number;
  progressPercent?: number;
};

export async function PUT(request: Request) {
  const reader = await getAuthenticatedReader(request);
  if (!reader) return unauthorized();

  const body = (await request.json()) as Body;
  if (!body.materialId || !body.sectionId || typeof body.passageIndex !== "number" || typeof body.progressPercent !== "number") {
    return validationError("materialId, sectionId, passageIndex, and progressPercent are required.");
  }

  const row = await getReaderRow(reader.readerId);
  if (!row) return unauthorized();

  const currentReading = (row.current_reading as Record<string, CurrentReadingEntry> | null) ?? {};
  const entry: CurrentReadingEntry = {
    materialId: body.materialId,
    sectionId: body.sectionId,
    passageIndex: body.passageIndex,
    audioTimeMs: body.audioTimeMs ?? null,
    progressPercent: body.progressPercent,
    updatedAt: new Date().toISOString(),
  };

  const { error } = await getSupabaseAdminClient()
    .from("readers")
    .update({ current_reading: { ...currentReading, [body.materialId]: entry } })
    .eq("id", reader.readerId);

  if (error) return validationError("Could not save reading position.");
  return new Response(null, { status: 204 });
}
