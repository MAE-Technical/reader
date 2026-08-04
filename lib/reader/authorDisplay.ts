// Deterministic per-pseudonym avatar color, drawn from the design system's
// accent palette — the same name always lands on the same color, so a
// comrade stays visually recognizable across a thread with no real
// per-user color assignment existing yet. Today there is only ever one
// author; this is what makes a second one a non-event later.
const AVATAR_COLORS = [
  "var(--color-brand-500)",
  "var(--color-oxblood-500)",
  "var(--color-olive-500)",
  "var(--color-forest-500)",
  "var(--color-brand-700)",
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function avatarColor(name: string): string {
  return AVATAR_COLORS[hash(name) % AVATAR_COLORS.length];
}

/** "Comrade Muiz" -> "M" — the letter after "Comrade ", uppercased; falls
 * back to the name's own first letter if it doesn't follow that pattern. */
export function avatarInitial(name: string): string {
  const rest = name.replace(/^Comrade\s+/i, "");
  return (rest || name).charAt(0).toUpperCase();
}
