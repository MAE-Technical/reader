"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { STORAGE_BUCKET } from "@/lib/storage/config";

export type DeletePendingMaterialResult = { ok: true } | { ok: false; error: string };

/** Remove the stored upload first. If Storage refuses the deletion, keep the
 * database row so the object is never orphaned and an admin can retry. */
export async function deletePendingMaterial(id: string): Promise<DeletePendingMaterialResult> {
  const admin = getSupabaseAdminClient();
  const { data: item, error: findError } = await admin
    .from("pending_materials")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle();

  if (findError || !item) return { ok: false, error: "This submission could not be found." };

  if (item.storage_path) {
    const { error: storageError } = await admin.storage.from(STORAGE_BUCKET).remove([item.storage_path]);
    if (storageError) return { ok: false, error: "The stored file could not be removed. Please try again." };
  }

  const { error: deleteError } = await admin.from("pending_materials").delete().eq("id", id);
  if (deleteError) return { ok: false, error: "The submission could not be removed. Please try again." };

  revalidatePath("/admin/books");
  return { ok: true };
}
