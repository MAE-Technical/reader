import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";

const UpdateMaterialSchema = z.object({
  title: z.string().trim().min(1).max(500),
  author: z.string().trim().min(1).max(300),
  description: z.string().trim().max(10_000).nullable(),
  language: z.string().trim().max(80).nullable(),
  materialType: z.string().trim().min(1).max(80),
  status: z.enum(["draft", "published"]),
  publishedYear: z.number().int().min(0).max(3000).nullable(),
  pageCountEstimate: z.number().int().min(1).max(100_000).nullable(),
  categories: z.array(z.string().trim().min(1).max(80)).max(30),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ materialId: string }> }) {
  const { materialId } = await params;
  const parsed = UpdateMaterialSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please check the book details and try again." }, { status: 400 });

  const input = parsed.data;
  const { data, error } = await getSupabaseAdminClient()
    .from("materials")
    .update({
      title: input.title,
      author: input.author,
      description: input.description,
      language: input.language,
      material_type: input.materialType,
      status: input.status,
      published_year: input.publishedYear,
      page_count_estimate: input.pageCountEstimate,
      categories: input.categories,
    })
    .eq("id", materialId)
    .select("id")
    .maybeSingle();

  if (error || !data) return NextResponse.json({ error: "We could not update this book. Please try again." }, { status: 500 });
  return NextResponse.json({ item: data });
}
