import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { getAuthenticatedReader } from "@/lib/auth/session";
import { unauthorized } from "@/lib/api/errors";
import { getReaderRow } from "@/lib/auth/profile";
import { toMaterialSummary } from "@/lib/materials/summary";
import type { CurrentReadingEntry } from "@/lib/api/types";
import { MATERIAL_SUMMARY_COLUMNS } from "@/lib/materials/columns";

export async function GET(request: Request) {
  const reader = await getAuthenticatedReader(request);
  if (!reader) return unauthorized();

  const row = await getReaderRow(reader.readerId);
  if (!row) return unauthorized();

  const currentReading = (row.current_reading as Record<string, CurrentReadingEntry> | null) ?? {};
  const entries = Object.values(currentReading).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (entries.length === 0) return NextResponse.json({ items: [] });

  const { data: materials } = await getSupabaseAdminClient()
    .from("materials")
    .select(MATERIAL_SUMMARY_COLUMNS)
    .in(
      "id",
      entries.map((e) => e.materialId)
    );
  const materialsById = new Map((materials ?? []).map((m) => [m.id, m]));

  const items = entries
    .map((entry) => {
      const material = materialsById.get(entry.materialId);
      if (!material) return null;
      return {
        material: toMaterialSummary(material),
        sectionId: entry.sectionId,
        passageIndex: entry.passageIndex,
        audioTimeMs: entry.audioTimeMs,
        progressPercent: entry.progressPercent,
        updatedAt: entry.updatedAt,
      };
    })
    .filter((item) => item !== null);

  return NextResponse.json({ items });
}
