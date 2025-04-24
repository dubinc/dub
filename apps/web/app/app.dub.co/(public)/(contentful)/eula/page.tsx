import { contentfulClient } from "@/lib/contentful/contenful.config.ts";
import { MarkdownPage } from "@/ui/contentful";
import { Metadata, NextPage } from "next";

export const generateMetadata = async (): Promise<Metadata> => {
  return {
    title: { absolute: "GetQR: Terms & Conditions" },
  };
};

const EulaPage: NextPage = async () => {
  const entry = await contentfulClient.getEntry(process.env.EULA_ENTRY_ID!);

  return <MarkdownPage pageContent={entry?.fields?.pageContent as string} />;
};

export default EulaPage;
