"use client";

import { Button } from "@dub/ui";
import { useUpdatePayoutSettingsModal } from "./update-payout-settings-modal";

export function PayoutSettingsButton() {
  const { UpdatePayoutSettingsModal, setShowUpdatePayoutSettingsModal } =
    useUpdatePayoutSettingsModal();

  return (
    <>
      <UpdatePayoutSettingsModal />
      <Button
        type="button"
        text="Payout settings"
        variant="secondary"
        onClick={() => setShowUpdatePayoutSettingsModal(true)}
      />
    </>
  );
}
