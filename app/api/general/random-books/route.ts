import { NextResponse } from "next/server";
import { getRandomPublishedMaterials } from "@/lib/materials/random";

/** `app/api/general` collects small, cross-cutting endpoints that don't
 * belong to one specific resource group (materials/auth/community) —
 * this one just needs published materials, shuffled. Public, no auth. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const count = Number(url.searchParams.get("count")) || 5;
  const items = await getRandomPublishedMaterials(count);
  return NextResponse.json({ items });
}
