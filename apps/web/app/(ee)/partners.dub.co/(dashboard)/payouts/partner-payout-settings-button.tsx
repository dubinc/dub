"use client";

import { Button } from "@dub/ui";
import { usePartnerPayoutSettingsModal } from "./partner-payout-settings-modal";

export function PartnerPayoutSettingsButton() {
  const { PartnerPayoutSettingsModal, setShowPartnerPayoutSettingsModal } =
    usePartnerPayoutSettingsModal();

  return (
    <>
      <PartnerPayoutSettingsModal />
      <Button
        type="button"
        text="Payout settings"
        variant="secondary"
        onClick={() => setShowPartnerPayoutSettingsModal(true)}
      />
    </>
  );
}
