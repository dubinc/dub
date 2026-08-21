import { PageContent } from "@/ui/layout/page-content";
import { HideProgramDetailsButton } from "./hide-program-details-button";
import { PartnerProgramOverviewPageClient } from "./page-client";

export default function PartnerProgramOverviewPage() {
  return (
    <PageContent
      title="Overview"
      titleInfo={{
        title:
          "Learn how to measure your performance, manage your referral links, and view your earnings for a program on Dub.",
        href: "https://dub.co/help/article/navigating-partner-program",
      }}
      controls={<HideProgramDetailsButton />}
    >
      <PartnerProgramOverviewPageClient />
    </PageContent>
  );
}
