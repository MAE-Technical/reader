import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import type { Database } from "@/lib/supabase/database.types";

const UpdateMaterialSchema = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  author: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(10_000).nullable().optional(),
  language: z.string().trim().max(80).nullable().optional(),
  materialType: z.string().trim().min(1).max(80).optional(),
  status: z.enum(["published", "unpublished"]).optional(),
  publishedYear: z.number().int().min(0).max(3000).nullable().optional(),
  pageCountEstimate: z.number().int().min(1).max(100_000).nullable().optional(),
  categories: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const { materialId } = await params;
  const parsed = UpdateMaterialSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the book details and try again." }, { status: 400 });

  const input = parsed.data;
  const update: Database["public"]["Tables"]["materials"]["Update"] = {};
  if (input.title !== undefined) update.title = input.title;
  if (input.author !== undefined) update.author = input.author;
  if (input.description !== undefined) update.description = input.description;
  if (input.language !== undefined) update.language = input.language;
  if (input.materialType !== undefined) update.material_type = input.materialType;
  // The admin UI calls the non-public state "unpublished", while the
  // materials table stores that state as "draft". Keep the API vocabulary
  // user-facing without sending a value rejected by the database check.
  if (input.status !== undefined) update.status = input.status === "unpublished" ? "draft" : "published";
  if (input.publishedYear !== undefined) update.published_year = input.publishedYear;
  if (input.pageCountEstimate !== undefined) update.page_count_estimate = input.pageCountEstimate;
  if (input.categories !== undefined) update.categories = input.categories;

  const { data, error } = await getSupabaseAdminClient().from("materials").update(update).eq("id", materialId).select("id, updated_at").maybeSingle();

  if (error || !data) return NextResponse.json({ error: "We could not update this book. Please try again." }, { status: 500 });
  return NextResponse.json({ item: data });
}
