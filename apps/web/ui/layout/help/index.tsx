import { createContext } from "react";

export interface HelpArticle {
  title: string;
  summary: string;
  searchableSummary?: string;
  slug: string;
}

export const HelpContext = createContext<{
  popularHelpArticles: HelpArticle[];
  allHelpArticles: HelpArticle[];
}>({
  popularHelpArticles: [],
  allHelpArticles: [],
});
