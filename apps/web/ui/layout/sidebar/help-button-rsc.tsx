import { getContentAPI } from "@/lib/fetchers/get-content-api";
import { HelpButton, HelpButtonVariant } from "./help-button";

export async function HelpButtonRSC({
  variant,
}: {
  variant?: HelpButtonVariant;
}) {
  const { popularHelpArticles, allHelpArticles } = await getContentAPI();

  return (
    <HelpButton
      variant={variant}
      popularHelpArticles={popularHelpArticles}
      allHelpArticles={allHelpArticles}
    />
  );
}
