import type { Metadata } from "next";
import HomeCommunityFeed from "@/app/components/home/HomeCommunityFeed";

export const metadata: Metadata = {
  title: "Home",
  description: "Pick up where you left off and see what comrades are discussing across the library right now.",
};

export default function HomePage() {
  return <HomeCommunityFeed />;
}
