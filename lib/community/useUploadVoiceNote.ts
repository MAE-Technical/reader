"use client";

import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";

/** `POST /api/community/voice-notes` — uploads a just-recorded draft's raw
 * bytes to durable storage and hands back the public URL that should be
 * saved as the note's `content.audioUrl` — never the recorder's own
 * `blob:` URL, which only resolves for this tab's lifetime. Supersedes the
 * old local-disk `app/api/voice-notes/route.ts`. */
export function useUploadVoiceNote() {
  return useMutation({
    mutationFn: (blob: Blob) =>
      apiFetch<{ url: string }>("/community/voice-notes", {
        method: "POST",
        body: blob,
        headers: { "Content-Type": blob.type || "audio/webm" },
      }).then((r) => r.url),
  });
}
