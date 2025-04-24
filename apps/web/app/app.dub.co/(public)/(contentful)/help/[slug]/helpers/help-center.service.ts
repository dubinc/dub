import { contentfulClient } from "@/lib/contentful/contenful.config.ts";
import { notFound } from "next/navigation";

export const getHelpCenterArticlesData = async (slug: string) => {
  const markdownData = await contentfulClient.getEntries({
    content_type: "helpCenterArticles",
    "fields.pageSlug": slug,
  });

  const rawData = markdownData.items?.[0]?.fields;

  if (!rawData) {
    return notFound();
  }

  return {
    title: (rawData?.title || "") as string,
    content: (rawData?.pageContent ?? "") as string,
  };
};
