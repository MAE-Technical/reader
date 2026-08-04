/** The single local pseudonym every note/reply in this browser is authored
 * as — there is no auth system yet, so this is the one line that changes
 * once real accounts exist. */
export const CURRENT_READER_NAME = "Comrade Yeast";

export function isOwnNote(note: { author: { name: string } }): boolean {
  return note.author.name === CURRENT_READER_NAME;
}
