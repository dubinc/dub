"use client";

import { hasPermission } from "@/lib/auth/partner-users/partner-user-permissions";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { useConnectPayoutModal } from "@/ui/partners/payouts/connect-payout-modal";
import { PartnerPayoutMethod } from "@dub/prisma/client";
import { Button, ButtonProps, TooltipContent } from "@dub/ui";
import { COUNTRIES } from "@dub/utils";
import { useCallback, useMemo } from "react";
import { usePayoutConnectFlow } from "./use-payout-connect-flow";

interface ConnectPayoutButtonProps extends ButtonProps {
  payoutMethod?: PartnerPayoutMethod;
  connected?: boolean;
  allowWhenPayoutsEnabled?: boolean;
}

export function ConnectPayoutButton({
  payoutMethod,
  connected,
  allowWhenPayoutsEnabled,
  ...props
}: ConnectPayoutButtonProps) {
  const { partner, availablePayoutMethods } = usePartnerProfile();

  const { setShowConnectPayoutModal, ConnectPayoutModal } =
    useConnectPayoutModal();

  const {
    connect,
    isPending,
    BankAccountRequirementsModal,
    StablecoinPayoutModal,
  } = usePayoutConnectFlow({
    closeParent: () => setShowConnectPayoutModal(false),
  });

  const handleClick = useCallback(() => {
    if (payoutMethod) {
      connect(payoutMethod);
      return;
    }
    setShowConnectPayoutModal(true);
  }, [payoutMethod, connect, setShowConnectPayoutModal]);

  const errorMessage = useMemo(
    () =>
      !partner?.country
        ? "You haven't set your country yet. Please update your country or contact support."
        : availablePayoutMethods.length === 0
          ? `Your current country (${COUNTRIES[partner.country]}) is not supported for payout. Please update your country or contact support.`
          : undefined,
    [partner, availablePayoutMethods],
  );

  if (partner && !hasPermission(partner.role, "payout_settings.update")) {
    return null;
  }

  if (partner?.payoutsEnabledAt && !allowWhenPayoutsEnabled) {
    return null;
  }

  return (
    <>
      {ConnectPayoutModal}
      {BankAccountRequirementsModal}
      {StablecoinPayoutModal}
      <Button
        onClick={handleClick}
        text={
          connected ? "Manage" : payoutMethod ? "Connect" : "Connect payout"
        }
        loading={isPending}
        disabledTooltip={
          errorMessage && (
            <TooltipContent
              title={errorMessage}
              cta="Update profile settings"
              href="/profile"
            />
          )
        }
        {...props}
      />
    </>
  );
}
