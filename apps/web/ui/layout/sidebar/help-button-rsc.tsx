import { getContentAPI } from "@/lib/fetchers/get-content-api";
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
