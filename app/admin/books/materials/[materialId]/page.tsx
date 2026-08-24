import { notFound } from "next/navigation";
import MaterialEditor from "./MaterialEditor";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";

export const dynamic = "force-dynamic";

export default async function AdminMaterialPage({ params }: { params: Promise<{ materialId: string }> }) {
  const { materialId } = await params;
  const { data: material } = await getSupabaseAdminClient().from("materials").select("*").eq("id", materialId).maybeSingle();
  if (!material) notFound();
  return <MaterialEditor material={material} />;
}
