import { Metadata } from "next";
import { constructMetadata } from "#/lib/utils";
import LegalPage from "#/ui/content/legal";
import { allLegalPosts } from "contentlayer/generated";

export const metadata: Metadata = constructMetadata({
  title: "Terms of Service – Dub",
  image: "/api/og/help?title=Terms+of+Service&summary=dub.co/terms",
});

export default function Terms() {
  const post = allLegalPosts.find((post) => post.slug === "terms")!;
  return <LegalPage post={post} />;
}
