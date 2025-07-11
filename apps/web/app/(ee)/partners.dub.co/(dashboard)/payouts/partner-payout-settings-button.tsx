"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { ConnectPayoutButton } from "@/ui/partners/connect-payout-button";
import { Button } from "@dub/ui";
import { usePartnerPayoutSettingsModal } from "./partner-payout-settings-modal";

export function PartnerPayoutSettingsButton() {
  const { partner } = usePartnerProfile();

  const { PartnerPayoutSettingsModal, setShowPartnerPayoutSettingsModal } =
    usePartnerPayoutSettingsModal();

  return (
    <>
      <PartnerPayoutSettingsModal />

      {!partner?.payoutsEnabledAt && <ConnectPayoutButton />}

      <Button
        type="button"
        text="Payout settings"
        variant="secondary"
        onClick={() => setShowPartnerPayoutSettingsModal(true)}
      />
    </>
  );
}
