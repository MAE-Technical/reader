import type { Metadata } from "next";
import ComingSoon from "@/app/components/shell/ComingSoon";

export const metadata: Metadata = {
  title: "Notes",
  description: "All the highlights and notes you've saved across the library, in one place.",
};

export default function NotesPage() {
  return <ComingSoon title="Notes" />;
}
