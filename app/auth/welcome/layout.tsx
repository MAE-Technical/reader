import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PLATFORM_NAME } from "@/lib/config/platform";

// page.tsx here is a client component ("use client"), which can't export
// `metadata` itself — this nested layout is the standard App Router way to
// still attach a title/description to that route.
export const metadata: Metadata = {
  title: "Welcome",
  description: `You're in — here's what to expect from ${PLATFORM_NAME}.`,
};

export default function WelcomeLayout({ children }: { children: ReactNode }) {
  return children;
}
