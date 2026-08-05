import type { Metadata } from "next";
import { listPublishedMaterials } from "@/lib/materials/list";
import SurveyWizard from "@/app/components/auth/SurveyWizard";

export const metadata: Metadata = {
  title: "Tell us about you",
  description: "A few quick questions to shape your reading recommendations and community feed.",
};

/**
 * "Have you read any of these books?" pulls from the real published-
 * materials list (`GET /api/materials`'s own query, called directly rather
 * than over HTTP — see listPublishedMaterials's own doc comment) — real
 * `materialId` UUIDs now, not `BookDocument` slugs, since that's what
 * `POST /api/auth/survey`'s `readMaterialIds` is actually keyed by.
 */
export default async function SurveyPage() {
  const { items } = await listPublishedMaterials({ limit: 50 });
  return <SurveyWizard materials={items} />;
}
