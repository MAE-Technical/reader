import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import type { Database } from "@/lib/supabase/database.types";

type PendingMaterialRow = Database["public"]["Tables"]["pending_materials"]["Row"];

export type PendingMaterial = PendingMaterialRow & { submitterPseudonym: string | null };

/** The review queue deliberately lives apart from `materials`: it contains
 * untrusted reader submissions and does not become part of the library until
 * the future ingestion service writes a canonical material record. */
export async function listPendingMaterials(): Promise<PendingMaterial[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from("pending_materials")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Could not load pending materials: ${error.message}`);

  const materials = data ?? [];
  const readerIds = [...new Set(materials.flatMap((material) => material.reader_id ? [material.reader_id] : []))];
  if (readerIds.length === 0) return materials.map((material) => ({ ...material, submitterPseudonym: null }));

  const { data: readers, error: readersError } = await admin.from("readers").select("id, pseudonym").in("id", readerIds);
  if (readersError) throw new Error(`Could not load submitters: ${readersError.message}`);

  const pseudonymByReaderId = new Map((readers ?? []).map((reader) => [reader.id, reader.pseudonym]));
  return materials.map((material) => ({ ...material, submitterPseudonym: material.reader_id ? pseudonymByReaderId.get(material.reader_id) ?? null : null }));
}
