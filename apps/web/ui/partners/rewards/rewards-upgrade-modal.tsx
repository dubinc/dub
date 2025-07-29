import { Grid, Modal } from "@dub/ui";
import { Dispatch, SetStateAction, useState } from "react";

export function RewardsUpgradeModal({
  showRewardsUpgradeModal,
  setShowRewardsUpgradeModal,
}: {
  showRewardsUpgradeModal: boolean;
  setShowRewardsUpgradeModal: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <Modal
      showModal={showRewardsUpgradeModal}
      setShowModal={setShowRewardsUpgradeModal}
    >
      <div className="relative p-8">
        <div className="absolute inset-y-0 left-1/2 w-[640px] -translate-x-1/2 [mask-image:linear-gradient(black,transparent)]">
          <Grid cellSize={35} patternOffset={[-29, -10]} />
        </div>

        <div className="relative flex flex-col gap-2">
          <div className="flex h-5 w-fit items-center justify-center rounded-md bg-violet-100 px-2 text-xs font-semibold text-violet-600">
            Upgrade to unlock
          </div>
          <h2 className="text-content-emphasis text-lg font-semibold">
            Get even more from your partner program
          </h2>
          <p className="text-content-default text-sm">
            When you upgrade to Advanced, you&rsquo;ll get access higher payout
            limits, flexible reward logic, white-labeling support, and much
            more.
          </p>
        </div>
      </div>
    </Modal>
  );
}

export function useRewardsUpgradeModal() {
  const [showRewardsUpgradeModal, setShowRewardsUpgradeModal] = useState(false);

  return {
    setShowRewardsUpgradeModal,
    rewardsUpgradeModal: (
      <RewardsUpgradeModal
        showRewardsUpgradeModal={showRewardsUpgradeModal}
        setShowRewardsUpgradeModal={setShowRewardsUpgradeModal}
      />
    ),
  };
}
