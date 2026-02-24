"use client";

import { generatePaypalOAuthUrl } from "@/lib/actions/partners/generate-paypal-oauth-url";
import { generateStripeAccountLink } from "@/lib/actions/partners/generate-stripe-account-link";
import { generateStripeRecipientAccountLink } from "@/lib/actions/partners/generate-stripe-recipient-account-link";
import { hasPermission } from "@/lib/auth/partner-users/partner-user-permissions";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { useBankAccountRequirementsModal } from "@/ui/partners/payouts/bank-account-requirements-modal";
import { useSelectPayoutMethodModal } from "@/ui/partners/payouts/select-payout-method-modal";
import { useStablecoinPayoutModal } from "@/ui/partners/payouts/stablecoin-payout-modal";
import { PartnerPayoutMethod } from "@dub/prisma/client";
import { Button, ButtonProps, TooltipContent } from "@dub/ui";
import { COUNTRIES } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

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
  const router = useRouter();
  const { partner, availablePayoutMethods } = usePartnerProfile();

  const {
    executeAsync: executeStripeConnect,
    isPending: isStripeConnectPending,
  } = useAction(generateStripeAccountLink, {
    onSuccess: ({ data }) => {
      router.push(data.url);
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const {
    executeAsync: executeStablecoinConnect,
    isPending: isStablecoinConnectPending,
  } = useAction(generateStripeRecipientAccountLink, {
    onSuccess: ({ data }) => {
      router.push(data.url);
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const {
    executeAsync: executePaypalConnect,
    isPending: isPaypalConnectPending,
  } = useAction(generatePaypalOAuthUrl, {
    onSuccess: ({ data }) => {
      router.push(data.url);
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const { setShowSelectPayoutMethodModal, SelectPayoutMethodModal } =
    useSelectPayoutMethodModal();

  const { setShowBankAccountRequirementsModal, BankAccountRequirementsModal } =
    useBankAccountRequirementsModal({
      onContinue: async () => {
        await executeStripeConnect();
      },
    });

  const { setShowStablecoinPayoutModal, StablecoinPayoutModal } =
    useStablecoinPayoutModal({
      onContinue: async () => {
        await executeStablecoinConnect();
      },
    });

  const handleClick = useCallback(() => {
    if (payoutMethod === "connect") {
      setShowSelectPayoutMethodModal(false);
      setShowBankAccountRequirementsModal(true);
      return;
    }

    if (payoutMethod === "stablecoin") {
      setShowSelectPayoutMethodModal(false);
      setShowStablecoinPayoutModal(true);
      return;
    }

    if (payoutMethod === "paypal") {
      executePaypalConnect();
      return;
    }

    setShowSelectPayoutMethodModal(true);
  }, [
    payoutMethod,
    setShowSelectPayoutMethodModal,
    setShowBankAccountRequirementsModal,
    setShowStablecoinPayoutModal,
    executePaypalConnect,
  ]);

  const isPending = useMemo(
    () =>
      isStripeConnectPending ||
      isStablecoinConnectPending ||
      isPaypalConnectPending,
    [
      isStripeConnectPending,
      isStablecoinConnectPending,
      isPaypalConnectPending,
    ],
  );

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
      {SelectPayoutMethodModal}
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
