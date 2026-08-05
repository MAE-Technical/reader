import type { Metadata } from "next";
import type { ReactNode } from "react";

// page.tsx here is a client component ("use client"), which can't export
// `metadata` itself — this nested layout is the standard App Router way to
// still attach a title/description to that route.
export const metadata: Metadata = {
  title: "Join the movement",
  description: "Create your pseudonymous reading account and start annotating alongside comrades.",
};

export default function SignupLayout({ children }: { children: ReactNode }) {
  return children;
}
