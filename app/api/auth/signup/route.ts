import { NextResponse } from "next/server";
import { getSupabaseAuthClient } from "@/lib/supabase/authClient";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { conflict, validationError } from "@/lib/api/errors";
import { toReaderProfile } from "@/lib/auth/profile";

type SignupBody = {
  fullName?: string;
  email?: string;
  password?: string;
  pseudonym?: string;
  city?: string;
  country?: string;
};

function validate(body: SignupBody) {
  if (!body.fullName?.trim()) return { field: "fullName", message: "Full name is required." };
  if (!body.email?.trim()) return { field: "email", message: "Email is required." };
  if (!body.password || body.password.length < 8) {
    return { field: "password", message: "Password must be at least 8 characters." };
  }
  if (!body.pseudonym?.trim()) return { field: "pseudonym", message: "Pseudonym is required." };
  return null;
}

export async function POST(request: Request) {
  const body = (await request.json()) as SignupBody;
  const invalid = validate(body);
  if (invalid) return validationError(invalid.message, invalid.field);

  const { fullName, email, password, pseudonym, city, country } = body as Required<
    Pick<SignupBody, "fullName" | "email" | "password" | "pseudonym">
  > &
    SignupBody;

  const admin = getSupabaseAdminClient();

  // Pre-check pseudonym uniqueness before creating an auth user at all — cheap,
  // and avoids having to roll back an auth.users row for the common case.
  const { data: existingPseudonym } = await admin.from("readers").select("id").eq("pseudonym", pseudonym).maybeSingle();
  if (existingPseudonym) return conflict("That pseudonym is taken — try another.", "pseudonym");

  const anon = getSupabaseAuthClient();
  const { data: signUpData, error: signUpError } = await anon.auth.signUp({ email, password });

  if (signUpError) {
    if (/already registered|already exists/i.test(signUpError.message)) {
      return conflict("This email is already registered.", "email");
    }
    return validationError(signUpError.message);
  }
  // Supabase Auth's user-enumeration-safe signal: a duplicate signUp for an
  // already-registered email succeeds with no error but an empty identities
  // array on the (fake) returned user.
  if (signUpData.user && signUpData.user.identities?.length === 0) {
    return conflict("This email is already registered.", "email");
  }
  const user = signUpData.user;
  if (!user) return validationError("Could not create account.");

  const { data: readerRow, error: insertError } = await admin
    .from("readers")
    .insert({ id: user.id, email, full_name: fullName, pseudonym, city: city ?? null, country: country ?? null })
    .select("*")
    .single();

  if (insertError || !readerRow) {
    await admin.auth.admin.deleteUser(user.id).catch(() => {});
    if (insertError?.code === "23505") return conflict("That pseudonym is taken — try another.", "pseudonym");
    return validationError(insertError?.message ?? "Could not create account.");
  }

  // This project assumes Supabase Auth's "Confirm email" setting is disabled
  // (an MVP, immediate-access signup flow) — signUp() already returns a
  // session in that case. If it's enabled, session is null here; fall back to
  // an immediate sign-in with the same credentials so the response contract
  // (always { reader, session }) still holds.
  let session = signUpData.session;
  if (!session) {
    const { data: signInData } = await anon.auth.signInWithPassword({ email, password });
    session = signInData.session ?? null;
  }
  if (!session) {
    await admin.auth.admin.deleteUser(user.id).catch(() => {});
    return validationError("Email confirmation is required before signing in — check Supabase Auth settings.");
  }

  return NextResponse.json(
    {
      reader: toReaderProfile(readerRow),
      session: {
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: new Date(session.expires_at! * 1000).toISOString(),
      },
    },
    { status: 201 }
  );
}
