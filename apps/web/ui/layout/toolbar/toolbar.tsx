import { Suspense } from "react";
import { HelpButton } from "./help-button";
import { OnboardingButton } from "./onboarding/onboarding-button";

const toolbarItems = ["onboarding", "help"] as const;

type ToolbarProps = {
  show?: (typeof toolbarItems)[number][];
};

export default function Toolbar(props: ToolbarProps) {
  return (
    <Suspense fallback={null}>
      <div className="fixed bottom-0 right-0 z-40 m-5">
        <ToolbarRSC {...props} />
      </div>
    </Suspense>
  );
}

async function ToolbarRSC({ show = ["onboarding", "help"] }: ToolbarProps) {
  const { popularHelpArticles, allHelpArticles } = await fetch(
    "https://dub.co/api/content",
    {
      next: {
        revalidate: 60 * 60 * 24, // cache for 24 hours
      },
    },
  )
    .then((res) => res.json())
    .catch(() => {
      console.error("Error fetching help articles");
      return { popularHelpArticles: [], allHelpArticles: [] };
    });

  return (
    <div className="flex items-center gap-3">
      {show.includes("onboarding") && (
        <div className="shrink-0">
          <OnboardingButton />
        </div>
      )}
      {show.includes("help") && (
        <div className="shrink-0">
          <HelpButton
            popularHelpArticles={popularHelpArticles}
            allHelpArticles={allHelpArticles}
          />
        </div>
      )}
    </div>
  );
}
