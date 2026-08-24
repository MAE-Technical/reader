import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/adminClient";
import { getAuthenticatedReader } from "@/lib/auth/session";
import { unauthorized } from "@/lib/api/errors";

export const runtime = "nodejs";

function value(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function requestError(message: string, status = 400) {
  return NextResponse.json(
    { error: { code: status >= 500 ? "unknown" : "validation_error", message } },
    { status },
  );
}

function persistenceError(operation: string, message: string, cause: unknown) {
  // Keep provider details in the server log for diagnosis, but never expose
  // them to the browser (they can include storage paths or database details).
  console.error(`Pending-materials ${operation} failed`, cause);
  return requestError(message, 500);
}

export async function POST(request: Request) {
  const reader = await getAuthenticatedReader(request);
  if (!reader) return unauthorized();

  const admin = getSupabaseAdminClient();

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return requestError("Please submit a valid form.");
  }

  const submissionType = value(formData, "submissionType");
  if (submissionType === "suggestion") {
    const title = value(formData, "title");
    if (!title) return requestError("Please enter the book title.");

    const { data, error: insertError } = await admin
      .from("pending_materials")
      .insert({ submission_type: "suggestion", title, author: value(formData, "author") || null, reader_id: reader.readerId })
      .select()
      .single();
    if (insertError) return persistenceError("suggestion insert", "We could not save your suggestion. Please try again.", insertError);
    return NextResponse.json({ items: [data] }, { status: 201 });
  }

  if (submissionType === "external_url") {
    const sourceUrl = value(formData, "sourceUrl");
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(sourceUrl);
    } catch {
      return requestError("Please enter a valid public URL.");
    }
    if (!/^https?:$/.test(parsedUrl.protocol)) return requestError("Please enter an http or https URL.");

    const title = value(formData, "title") || parsedUrl.hostname.replace(/^www\./, "");
    const { data, error: insertError } = await admin
      .from("pending_materials")
      .insert({
        submission_type: "external_url",
        title,
        author: value(formData, "author") || null,
        reader_id: reader.readerId,
        source_url: parsedUrl.toString(),
      })
      .select()
      .single();
    if (insertError) return persistenceError("external URL insert", "We could not save this link. Please try again.", insertError);
    return NextResponse.json({ items: [data] }, { status: 201 });
  }

  return requestError("Choose a book suggestion or public link.");
}
