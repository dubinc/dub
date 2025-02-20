import { HoldingPeriods } from "./holding-periods";
import { RewardSettings } from "./reward-settings";

export default async function ProgramSettingsRewardsPage() {
  return (
    <>
      <RewardSettings />
      <HoldingPeriods />
    </>
  );
}
