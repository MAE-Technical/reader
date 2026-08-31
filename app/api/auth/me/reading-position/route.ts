import { getAuthenticatedReader } from "@/lib/auth/session";
import { unauthorized, validationError } from "@/lib/api/errors";
import { saveReaderActivity } from "@/lib/reader/activity";

type Body = {
  materialId?: string;
  sectionId?: string;
  passageIndex?: number;
  audioTimeMs?: number;
  progressPercent?: number;
};

export async function PUT(request: Request) {
  const reader = await getAuthenticatedReader(request);
  if (!reader) return unauthorized();

  const body = (await request.json()) as Body;
  if (!body.materialId || !body.sectionId || typeof body.passageIndex !== "number" || typeof body.progressPercent !== "number") {
    return validationError("materialId, sectionId, passageIndex, and progressPercent are required.");
  }

  const saved = await saveReaderActivity(reader.readerId, {
    materialId: body.materialId,
    sectionId: body.sectionId,
    passageIndex: body.passageIndex,
    audioTimeMs: body.audioTimeMs ?? null,
    progressPercent: body.progressPercent,
  });

  if (!saved) return validationError("Could not save reading position.");
  return new Response(null, { status: 204 });
}
