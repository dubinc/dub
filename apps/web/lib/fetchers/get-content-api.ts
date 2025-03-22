import { HelpArticle } from "@/ui/layout/help";
import { NewsArticle } from "@/ui/layout/sidebar/news";
import { cache } from "react";

export const getContentAPI: () => Promise<{
  allHelpArticles: HelpArticle[];
  popularHelpArticles: HelpArticle[];
  latestNewsArticles: NewsArticle[];
}> = cache(async () => {
  try {
    return await fetch("https://dub.co/api/content", {
      next: {
        revalidate: 60 * 60 * 24, // cache for 24 hours
      },
    }).then((res) => res.json());
  } catch (e) {
    return {
      allHelpArticles: [],
      popularHelpArticles: [],
      latestNewsArticles: [],
    };
  }
});
