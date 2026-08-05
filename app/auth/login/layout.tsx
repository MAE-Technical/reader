import type { Metadata } from "next";
import type { ReactNode } from "react";

// page.tsx here is a client component ("use client"), which can't export
// `metadata` itself — this nested layout is the standard App Router way to
// still attach a title/description to that route.
export const metadata: Metadata = {
  title: "Log in",
  description: "Log back in to continue reading and pick up your community notes.",
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
