import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { getAuthenticatedReader } from "@/lib/auth/session";
import { forbidden, notFound, unauthorized } from "@/lib/api/errors";

export async function DELETE(request: Request, { params }: { params: Promise<{ materialId: string; highlightId: string }> }) {
  const reader = await getAuthenticatedReader(request);
  if (!reader) return unauthorized();

  const { highlightId } = await params;
  const admin = getSupabaseAdminClient();

  const { data: existing } = await admin.from("highlights").select("reader_id").eq("id", highlightId).maybeSingle();
  if (!existing) return notFound();
  if (existing.reader_id !== reader.readerId) return forbidden();

  const { error } = await admin.from("highlights").delete().eq("id", highlightId);
  if (error) return notFound();
  return new Response(null, { status: 204 });
}
