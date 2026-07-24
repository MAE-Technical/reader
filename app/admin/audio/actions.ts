"use server";

import { revalidatePath } from "next/cache";
import { generateBookAudio as runGenerateBookAudio, type GenerateResult } from "@/lib/audio/generate";

export type { GenerateResult };

export async function generateBookAudio(slug: string): Promise<GenerateResult> {
  const result = await runGenerateBookAudio(slug);
  revalidatePath("/admin/audio");
  revalidatePath(`/read/${slug}`);
  return result;
}
