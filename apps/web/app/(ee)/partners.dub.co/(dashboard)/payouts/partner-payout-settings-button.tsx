"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { ConnectPayoutButton } from "@/ui/partners/connect-payout-button";
import { Button } from "@dub/ui";
import { usePartnerPayoutSettingsSheet } from "./partner-payout-settings-sheet";

export function PartnerPayoutSettingsButton() {
  const { partner } = usePartnerProfile();

  const { PartnerPayoutSettingsSheet, setShowPartnerPayoutSettingsSheet } =
    usePartnerPayoutSettingsSheet();

  return (
    <>
      <PartnerPayoutSettingsSheet />

      {!partner?.payoutsEnabledAt && <ConnectPayoutButton />}

      <Button
        type="button"
        text="Payout settings"
        variant="secondary"
        onClick={() => setShowPartnerPayoutSettingsSheet(true)}
      />
    </>
  );
}
