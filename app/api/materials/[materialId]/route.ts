import { NextResponse } from "next/server";
import { notFound } from "@/lib/api/errors";
import { resolveMaterialRow } from "@/lib/materials/resolve";
import { MaterialSectionNotFoundError, projectMaterial } from "@/lib/materials/projection";

export async function GET(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const { materialId } = await params;
  const row = await resolveMaterialRow(materialId);
  if (!row) return notFound();

  const url = new URL(request.url);
  const fieldsParam = url.searchParams.get("fields");
  const fields = fieldsParam
    ? fieldsParam
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean)
    : [];
  const sectionId = url.searchParams.get("sectionId") ?? undefined;
  const passagesOnly = url.searchParams.get("passagesOnly") === "true";

  try {
    const projected = await projectMaterial(row, { fields, sectionId, passagesOnly });
    return NextResponse.json(projected);
  } catch (err) {
    if (err instanceof MaterialSectionNotFoundError) return notFound();
    throw err;
  }
}
