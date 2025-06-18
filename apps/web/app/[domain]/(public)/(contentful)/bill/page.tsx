import { Metadata, NextPage } from "next";

import { contentfulClient } from "@/lib/contentful/contenful.config.ts";
import { MarkdownPage } from "@/ui/contentful";

export const generateMetadata = async (): Promise<Metadata> => {
  return {
    title: { absolute: "GetQR: Bill" },
  };
};

const BillingPage: NextPage = async () => {
  const entry = await contentfulClient.getEntry(process.env.BILLING_ENTRY_ID!);
  console.log(
    "process.env.BILLING_ENTRY_ID entry:",
    process.env.BILLING_ENTRY_ID,
    entry,
  );
  return <MarkdownPage pageContent={entry?.fields?.pageContent as string} />;
};

export default BillingPage;
