import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { getAuthenticatedReader } from "@/lib/auth/session";
import { unauthorized } from "@/lib/api/errors";

export async function POST(request: Request) {
  const reader = await getAuthenticatedReader(request);
  if (!reader) return unauthorized();

  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  const token = header!.slice("Bearer ".length).trim();

  // admin.signOut(jwt) needs the secret key (it's an admin-namespace call
  // regardless of which client object it's invoked from), so this goes
  // through the admin client even though every other auth call here uses the
  // publishable one — invalidates just this one token's session, not the account.
  await getSupabaseAdminClient().auth.admin.signOut(token, "local").catch(() => {});

  return new Response(null, { status: 204 });
}
