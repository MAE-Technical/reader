// A client-only id stamped onto a not-yet-persisted row so an optimistic
// mutation can find and replace/remove it once the real server row (or a
// rollback) comes back — never sent to the server, never mistaken for a
// real uuid. Distinct from useTextAnnotations.ts's PENDING_ANNOTATION_ID,
// which is a single-slot cosmetic-only sentinel for the notes-panel wash,
// not a general temp-id scheme.
const TEMP_PREFIX = "temp-";

export function makeTempId(): string {
  return `${TEMP_PREFIX}${crypto.randomUUID()}`;
}

export function isTempId(id: string): boolean {
  return id.startsWith(TEMP_PREFIX);
}
