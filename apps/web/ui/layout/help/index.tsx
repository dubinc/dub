import { Suspense } from "react";
import { HelpButton } from "./portal";

export interface HelpArticle {
  title: string;
  summary: string;
  searchableSummary?: string;
  slug: string;
}

export default function HelpPortal() {
  return (
    <Suspense fallback={null}>
      <div className="fixed bottom-0 right-0 z-40 m-5">
        <HelpPortalRSC />
      </div>
    </Suspense>
  );
}

async function HelpPortalRSC() {
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
