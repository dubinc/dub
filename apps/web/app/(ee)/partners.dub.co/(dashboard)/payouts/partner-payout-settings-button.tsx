"use client";

import { hasPermission } from "@/lib/auth/partner-users/partner-user-permissions";
import usePartnerPayoutSettings from "@/lib/swr/use-partner-payout-settings";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { ConnectPayoutButton } from "@/ui/partners/payouts/connect-payout-button";
import { Button } from "@dub/ui";
import { usePartnerPayoutSettingsSheet } from "./partner-payout-settings-sheet";

export function PartnerPayoutSettingsButton() {
  const { partner } = usePartnerProfile();
  const { payoutMethods } = usePartnerPayoutSettings();

  const { PartnerPayoutSettingsSheet, openSettings } =
    usePartnerPayoutSettingsSheet();

  const hasConnectedPayoutMethod = payoutMethods.some((m) => m.connected);

  if (partner && !hasPermission(partner.role, "payout_settings.update")) {
    return null;
  }

  return (
    <>
      <PartnerPayoutSettingsSheet />

      {!partner?.payoutsEnabledAt && !hasConnectedPayoutMethod && (
        <ConnectPayoutButton className="h-9 px-3" />
      )}

      <Button
        type="button"
        text="Payout settings"
        variant="secondary"
        className="h-9 px-3"
        onClick={openSettings}
      />
    </>
  );
}
