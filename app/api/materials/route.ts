import { NextResponse } from "next/server";
import { decodeCursor, type Keyset } from "@/lib/api/cursor";
import { listPublishedMaterials, type MaterialsSort, type OffsetCursor } from "@/lib/materials/list";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sortParam = url.searchParams.get("sort");
  const sort: MaterialsSort = sortParam === "top" ? "top" : "recent";
  const { items, nextCursor } = await listPublishedMaterials({
    category: url.searchParams.get("category"),
    search: url.searchParams.get("search"),
    limit: Number(url.searchParams.get("limit")) || 24,
    sort,
    // `top`'s cursor is an {offset} payload, `recent`'s a {createdAt, id}
    // keyset — same opaque token either way, decoded generically here and
    // narrowed by listPublishedMaterials itself (see its own `"offset" in
    // cursor` / `"createdAt" in cursor` checks).
    cursor: decodeCursor<Keyset | OffsetCursor>(url.searchParams.get("cursor")),
  });
  return NextResponse.json({ items, nextCursor });
}
