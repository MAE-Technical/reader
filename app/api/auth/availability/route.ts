import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";

// Pre-submit availability check for signup's own fields — lets the form
// gate "Continue" on a field actually being takeable before the reader
// reaches the final submit, rather than only learning "that email/pseudonym
// is taken" after filling out every later step. Mirrors the uniqueness
// checks POST /api/auth/signup itself does at write time (readers.email,
// readers.pseudonym) — same source of truth, just read-only and earlier.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email")?.trim().toLowerCase();
  const pseudonym = url.searchParams.get("pseudonym")?.trim();

  const admin = getSupabaseAdminClient();
  const result: { email?: { available: boolean }; pseudonym?: { available: boolean } } = {};

  if (email) {
    const { data } = await admin.from("readers").select("id").ilike("email", email).maybeSingle();
    result.email = { available: !data };
  }
  if (pseudonym) {
    const { data } = await admin.from("readers").select("id").ilike("pseudonym", pseudonym).maybeSingle();
    result.pseudonym = { available: !data };
  }

  return NextResponse.json(result);
}
