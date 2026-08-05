import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getMaterialDetail, MaterialNotFoundError } from "@/lib/materials/detail";
import BookDetailView from "@/app/components/book/BookDetailView";
import { PLATFORM_NAME, PLATFORM_URL } from "@/lib/config/platform";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let material;
  try {
    material = await getMaterialDetail(slug);
  } catch {
    return { title: "Book not found" };
  }
  const { title, author, cover, description } = material;
  const url = `${PLATFORM_URL}/book/${slug}`;
  const desc = description || `${title} by ${author} — read or listen on ${PLATFORM_NAME}.`;
  return {
    title,
    description: desc,
    openGraph: { title, description: desc, url, images: cover ? [{ url: cover, alt: title }] : [], type: "book" },
    twitter: { title, description: desc, images: cover ? [cover] : [] },
  };
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let material;
  try {
    material = await getMaterialDetail(slug);
  } catch (err) {
    if (err instanceof MaterialNotFoundError) {
      notFound();
    }
    throw err;
  }
  return <BookDetailView material={material} />;
}
