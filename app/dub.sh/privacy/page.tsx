import { Metadata } from "next";
import { constructMetadata } from "#/lib/utils";
import LegalPage from "#/ui/blog/legal";
import { allLegalPosts } from "contentlayer/generated";

export const metadata: Metadata = constructMetadata({
  title: "Privacy Policy - Dub",
});

export default function Privacy() {
  const post = allLegalPosts.find((post) => post.slug === "privacy")!;
  return <LegalPage post={post} />;
}
