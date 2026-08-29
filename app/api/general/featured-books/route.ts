import { NextResponse } from "next/server";
import { getFeaturedBooks } from "@/lib/featured/config";

/** `app/api/general` collects small, cross-cutting endpoints that don't
 * belong to one specific resource group (materials/auth/community) — this
 * one just resolves config/featured.json's curated picks against the real
 * catalog (see getFeaturedBooks's own doc comment). Public, no auth. */
export async function GET() {
  const items = await getFeaturedBooks();
  return NextResponse.json({ items });
}
