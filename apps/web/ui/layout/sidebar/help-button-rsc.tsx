import { HelpButton } from "./help-button";

export async function HelpButtonRSC() {
  const { popularHelpArticles, allHelpArticles } = await fetch(
    "https://dub.co/api/content",
    {
      next: {
        revalidate: 60 * 60 * 24, // cache for 24 hours
      },
    },
  ).then((res) => res.json());

  return (
    <HelpButton
      popularHelpArticles={popularHelpArticles}
      allHelpArticles={allHelpArticles}
    />
  );
}
