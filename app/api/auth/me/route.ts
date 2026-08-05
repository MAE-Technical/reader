import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { getAuthenticatedReader } from "@/lib/auth/session";
import { conflict, unauthorized, validationError } from "@/lib/api/errors";
import { getReaderRow, toReaderProfile } from "@/lib/auth/profile";
import type { Database } from "@/lib/supabase/database.types";

export async function GET(request: Request) {
  const reader = await getAuthenticatedReader(request);
  if (!reader) return unauthorized();

  const row = await getReaderRow(reader.readerId);
  if (!row) return unauthorized();
  return NextResponse.json({ reader: toReaderProfile(row) });
}

export async function PATCH(request: Request) {
  const reader = await getAuthenticatedReader(request);
  if (!reader) return unauthorized();

  const body = (await request.json()) as { fullName?: string; pseudonym?: string; city?: string; country?: string };
  const update: Database["public"]["Tables"]["readers"]["Update"] = {};
  if (body.fullName !== undefined) update.full_name = body.fullName;
  if (body.pseudonym !== undefined) update.pseudonym = body.pseudonym;
  if (body.city !== undefined) update.city = body.city;
  if (body.country !== undefined) update.country = body.country;

  const { data: updated, error } = await getSupabaseAdminClient()
    .from("readers")
    .update(update)
    .eq("id", reader.readerId)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") return conflict("That pseudonym is taken — try another.", "pseudonym");
    return validationError(error.message);
  }
  if (!updated) return unauthorized();
  return NextResponse.json({ reader: toReaderProfile(updated) });
}
