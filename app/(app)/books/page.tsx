import type { Metadata } from "next";
import ReadingView from "@/app/components/books/ReadingView";

export const metadata: Metadata = {
  title: "Reading",
  description: "Continue reading the books you have started on Ominira.",
};

export default function ReadingPage() {
  return <ReadingView />;
}
