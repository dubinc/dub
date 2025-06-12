import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { Rewards } from "./rewards";
import { RewardSettings } from "./settings";

export default async function ProgramSettingsRewardsPage() {
  return (
    <PageContent title="Rewards">
      <PageWidthWrapper>
        <div className="mb-8 grid grid-cols-1 gap-8">
          <Rewards />
          <RewardSettings />
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
