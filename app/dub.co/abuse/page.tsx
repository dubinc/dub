import { Metadata } from "next";
import { constructMetadata } from "#/lib/utils";
import Script from "next/script";
import LegalPage from "#/ui/content/legal";
import { allLegalPosts } from "contentlayer/generated";

export const metadata: Metadata = constructMetadata({
  title: "Report Abuse – Dub",
  image: "/api/og/help?title=Report+Abuse&summary=dub.co/abuse",
});

export default function Abuse() {
  const post = allLegalPosts.find((post) => post.slug === "abuse")!;
  return (
    <>
      <Script src="https://tally.so/widgets/embed.js" strategy="lazyOnload" />
      <LegalPage post={post} />
    </>
  );
}
