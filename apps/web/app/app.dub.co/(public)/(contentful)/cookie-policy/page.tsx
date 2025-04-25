import { Metadata, NextPage } from "next";

import { contentfulClient } from "@/lib/contentful/contenful.config.ts";
import { MarkdownPage } from "@/ui/contentful";

export const generateMetadata = async (): Promise<Metadata> => {
  return {
    title: { absolute: "GetQR: Cookie Policy" },
  };
};

const CookiePolicyPage: NextPage = async () => {
  const entry = await contentfulClient.getEntry(
    process.env.COOKIE_POLICY_ENTRY_ID!,
  );
  console.log(
    "process.env.COOKIE_POLICY_ENTRY_ID entry:",
    process.env.COOKIE_POLICY_ENTRY_ID,
    entry,
  );
  return <MarkdownPage pageContent={entry?.fields?.pageContent as string} />;
};

export default CookiePolicyPage;
