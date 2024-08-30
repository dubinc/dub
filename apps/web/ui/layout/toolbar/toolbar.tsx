import { Suspense } from "react";
import { HelpButton } from "./help/help-button";
import { OnboardingButton } from "./onboarding/onboarding-button";

export default function Toolbar() {
  return (
    <Suspense fallback={null}>
      <div className="fixed bottom-0 right-0 z-40 m-5">
        <ToolbarRSC />
      </div>
    </Suspense>
  );
}

async function ToolbarRSC() {
  const { popularHelpArticles, allHelpArticles } = await fetch(
    "https://dub.co/api/content",
    {
      next: {
        revalidate: 60 * 60 * 24, // cache for 24 hours
      },
    },
  ).then((res) => res.json());

  return (
    <div className="flex items-center gap-3">
      <div className="shrink-0">
        <OnboardingButton />
      </div>
      <div className="shrink-0">
        <HelpButton
          popularHelpArticles={popularHelpArticles}
          allHelpArticles={allHelpArticles}
        />
      </div>
    </div>
  );
}
