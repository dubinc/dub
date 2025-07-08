import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { Rewards } from "./rewards";

export default async function ProgramSettingsRewardsPage() {
  return (
    <PageContent
      title="Rewards"
      titleInfo={{
        title:
          "Create click, lead, and sale-based rewards to incentivize your partners to drive more traffic and conversions.",
        href: "https://dub.co/help/article/partner-rewards",
      }}
    >
      <PageWidthWrapper>
        <div className="mb-8">
          <Rewards />
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
