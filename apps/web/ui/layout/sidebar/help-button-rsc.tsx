import { getContentAPI } from "@/lib/fetchers";
import { HelpButton } from "./help-button";

export async function HelpButtonRSC() {
  const { popularHelpArticles, allHelpArticles } = await getContentAPI();

  return (
    <HelpButton
      popularHelpArticles={popularHelpArticles}
      allHelpArticles={allHelpArticles}
    />
  );
}
