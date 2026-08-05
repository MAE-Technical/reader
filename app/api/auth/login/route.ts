import { NextResponse } from "next/server";
import { getSupabaseAuthClient } from "@/lib/supabase/authClient";
import { unauthorized, validationError } from "@/lib/api/errors";
import { getReaderRow, toReaderProfile } from "@/lib/auth/profile";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  if (!body.email || !body.password) return validationError("Email and password are required.");

  const { data, error } = await getSupabaseAuthClient().auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  // Deliberately generic, no `field` — api-spec.md: can't be used to
  // enumerate which registered emails exist.
  if (error || !data.session || !data.user) return unauthorized("Incorrect email or password.");

  const readerRow = await getReaderRow(data.user.id);
  if (!readerRow) return unauthorized("Incorrect email or password.");

  return NextResponse.json({
    reader: toReaderProfile(readerRow),
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: new Date(data.session.expires_at! * 1000).toISOString(),
    },
  });
}
