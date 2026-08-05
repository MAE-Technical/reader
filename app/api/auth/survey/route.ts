import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { getAuthenticatedReader } from "@/lib/auth/session";
import { unauthorized, validationError } from "@/lib/api/errors";
import { getReaderRow, toReaderProfile } from "@/lib/auth/profile";

export async function POST(request: Request) {
  const reader = await getAuthenticatedReader(request);
  if (!reader) return unauthorized();

  const body = (await request.json()) as { interests?: string[]; readMaterialIds?: string[] };
  if (!Array.isArray(body.interests) || !Array.isArray(body.readMaterialIds)) {
    return validationError("interests and readMaterialIds must both be arrays.");
  }

  const current = await getReaderRow(reader.readerId);
  if (!current) return unauthorized();

  // Idempotent: only ever advances forward, never backward — calling this
  // again just overwrites the answers (api-spec.md).
  const nextStatus = current.onboarding_status === "pending_survey" ? "pending_welcome" : current.onboarding_status;

  const { data: updated, error } = await getSupabaseAdminClient()
    .from("readers")
    .update({ interests: body.interests, survey_read_material_ids: body.readMaterialIds, onboarding_status: nextStatus })
    .eq("id", reader.readerId)
    .select("*")
    .single();

  if (error || !updated) return validationError("Could not save survey answers.");
  return NextResponse.json({ reader: toReaderProfile(updated) });
}
