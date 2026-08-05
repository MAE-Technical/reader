import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { toMaterialSummary } from "@/lib/materials/summary";
import { decodeCursor, encodeCursor, keysetBeforeFilter, type Keyset } from "@/lib/api/cursor";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get("category");
  const search = url.searchParams.get("search");
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 20, 1), 100);
  const cursor = decodeCursor<Keyset>(url.searchParams.get("cursor"));

  let query = getSupabaseAdminClient()
    .from("materials")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);

  if (category) query = query.contains("categories", [category]);
  if (search) {
    // Filters via the same tsvector column models-spec.md defines
    // (search_vector). True ts_rank relevance ordering would need a
    // computed-column SQL function PostgREST can order by, which isn't part
    // of this pass's schema — recency is a reasonable stand-in for now, and
    // keeps this list's keyset pagination uniform whether or not a search
    // term is present.
    query = query.textSearch("search_vector", search, { type: "plain", config: "english" });
  }
  if (cursor) query = query.or(keysetBeforeFilter(cursor));

  const { data, error } = await query;
  if (error) return NextResponse.json({ items: [], nextCursor: null });

  const rows = data ?? [];
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  const nextCursor = hasMore && last ? encodeCursor({ createdAt: last.created_at, id: last.id }) : null;

  return NextResponse.json({ items: page.map(toMaterialSummary), nextCursor });
}
