import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { getAuthenticatedReader } from "@/lib/auth/session";
import { unauthorized, validationError } from "@/lib/api/errors";
import { getReaderRow, toReaderProfile } from "@/lib/auth/profile";

export async function POST(request: Request) {
  const reader = await getAuthenticatedReader(request);
  if (!reader) return unauthorized();

  const current = await getReaderRow(reader.readerId);
  if (!current) return unauthorized();

  if (current.onboarding_status !== "pending_welcome") {
    // Already active (or never surveyed) — no-op, unchanged profile.
    return NextResponse.json({ reader: toReaderProfile(current) });
  }

  const { data: updated, error } = await getSupabaseAdminClient()
    .from("readers")
    .update({ onboarding_status: "active" })
    .eq("id", reader.readerId)
    .select("*")
    .single();

  if (error || !updated) return validationError("Could not complete onboarding.");
  return NextResponse.json({ reader: toReaderProfile(updated) });
}
