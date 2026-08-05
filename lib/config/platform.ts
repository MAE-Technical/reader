export const PLATFORM_NAME = process.env.NEXT_PUBLIC_PLATFORM_NAME ?? "Ominira";
export const PLATFORM_URL = process.env.NEXT_PUBLIC_PLATFORM_URL ?? "https://ominira.com";
// Bare host, no protocol — for display-only spots like the share-quote watermark, which shows
// "ominira.com" style text, never a clickable link.
export const PLATFORM_HOST = PLATFORM_URL.replace(/^https?:\/\//, "");
