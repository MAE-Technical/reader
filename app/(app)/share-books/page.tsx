import type { Metadata } from "next";
import ShareBooksForm from "@/app/components/materials/ShareBooksForm";

export const metadata: Metadata = {
  title: "Share books",
  description: "Help grow the Ominira library by sharing a book or suggesting one for the community.",
};

export default function ShareBooksPage() {
  return <ShareBooksForm />;
}
