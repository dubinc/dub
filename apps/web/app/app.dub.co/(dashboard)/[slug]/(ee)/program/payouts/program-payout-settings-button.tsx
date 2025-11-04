"use client";

import { Button } from "@dub/ui";
import { useProgramPayoutSettingsModal } from "./program-payout-settings-modal";

export function ProgramPayoutSettingsButton() {
  const { ProgramPayoutSettingsModal, setShowProgramPayoutSettingsModal } =
    useProgramPayoutSettingsModal();

  return (
    <>
      <ProgramPayoutSettingsModal />
      <Button
        type="button"
        text="Payout settings"
        variant="secondary"
        onClick={() => setShowProgramPayoutSettingsModal(true)}
      />
    </>
  );
}
