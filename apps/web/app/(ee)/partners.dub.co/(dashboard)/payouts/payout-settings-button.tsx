"use client";

import { Button } from "@dub/ui";
import { usePayoutSettingsModal } from "./payout-settings-modal";

export function PayoutSettingsButton() {
  const { PayoutSettingsModal, setShowPayoutSettingsModal } =
    usePayoutSettingsModal();

  return (
    <>
      <PayoutSettingsModal />
      <Button
        type="button"
        text="Payout settings"
        variant="secondary"
        onClick={() => setShowPayoutSettingsModal(true)}
      />
    </>
  );
}
