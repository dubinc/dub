"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { useConnectPayoutModal } from "@/ui/partners/payouts/connect-payout-modal";
import { Button, ButtonProps, TooltipContent } from "@dub/ui";
import { PartnerPayoutMethod } from "@prisma/client";
import { useCallback, useMemo } from "react";
import { getConnectPayoutDisabledTooltip } from "./connect-payout-disabled-tooltip";
import { usePayoutConnectFlow } from "./use-payout-connect-flow";

interface ConnectPayoutButtonProps extends ButtonProps {
  payoutMethod?: PartnerPayoutMethod;
  connected?: boolean;
}

export function ConnectPayoutButton({
  payoutMethod,
  connected,
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
    } else if (availablePayoutMethods.length === 1) {
      connect(availablePayoutMethods[0]);
      return;
    }
    setShowConnectPayoutModal(true);
  }, [payoutMethod, connect, setShowConnectPayoutModal]);

  const disabledTooltipConfig = useMemo(
    () =>
      getConnectPayoutDisabledTooltip({
        partner,
        availablePayoutMethods,
      }),
    [partner, availablePayoutMethods],
  );

  return (
    <>
      {ConnectPayoutModal}
      {BankAccountRequirementsModal}
      {StablecoinPayoutModal}
      <Button
        onClick={handleClick}
        text={
          connected
            ? "Manage"
            : payoutMethod
              ? "Connect"
              : props.text || "Connect payout method"
        }
        loading={isPending}
        {...(disabledTooltipConfig && {
          disabledTooltip: (
            <TooltipContent
              title={disabledTooltipConfig.title}
              cta={disabledTooltipConfig.cta}
              href={disabledTooltipConfig.href}
            />
          ),
        })}
        {...props}
      />
    </>
  );
}
