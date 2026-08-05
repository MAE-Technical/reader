import { getSupabaseAuthClient } from "@/lib/supabase/authClient";

/**
 * Every protected route calls this first and returns 401 (lib/api/errors.ts's
 * `unauthorized()`) when it's null — this is the actual security boundary
 * (api-spec.md's Conventions); RLS policies (models-spec.md) are
 * defense-in-depth on top of it, not a substitute for it.
 */
export async function getAuthenticatedReader(request: Request): Promise<{ readerId: string } | null> {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (!token) return null;

  const { data, error } = await getSupabaseAuthClient().auth.getUser(token);
  if (error || !data.user) return null;
  return { readerId: data.user.id };
}
