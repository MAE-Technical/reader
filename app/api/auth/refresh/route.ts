import { NextResponse } from "next/server";
import { getSupabaseAuthClient } from "@/lib/supabase/authClient";
import { unauthorized, validationError } from "@/lib/api/errors";

// Exchanges a still-valid refresh token for a new access token — what keeps
// a reader signed in well past the access token's own short lifetime
// (Supabase's default is ~1h) without ever asking for their password
// again. Called transparently by lib/api/client.ts's apiFetch whenever the
// stored access token is expired or close to it, and proactively at app
// boot (QueryProvider) so a reader reopening the app after days away comes
// back already signed in rather than only once their first API call
// happens to trigger a refresh.
export async function POST(request: Request) {
  const body = (await request.json()) as { refreshToken?: string };
  if (!body.refreshToken) return validationError("refreshToken is required.");

  const { data, error } = await getSupabaseAuthClient().auth.refreshSession({ refresh_token: body.refreshToken });
  if (error || !data.session) return unauthorized("Session expired — please log in again.");

  return NextResponse.json({
    session: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: new Date(data.session.expires_at! * 1000).toISOString(),
    },
  });
}
