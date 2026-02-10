"use client";

import { generatePaypalOAuthUrl } from "@/lib/actions/partners/generate-paypal-oauth-url";
import { generateStripeAccountLink } from "@/lib/actions/partners/generate-stripe-account-link";
import { hasPermission } from "@/lib/auth/partner-users/partner-user-permissions";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { useBankAccountRequirementsModal } from "@/ui/partners/bank-account-requirements-modal";
import { useChoosePayoutMethodModal } from "@/ui/partners/choose-payout-method-modal";
import { Button, ButtonProps, TooltipContent } from "@dub/ui";
import { COUNTRIES } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import type { StripePayoutMethodType } from "./payout-method-options";

type ConnectPayoutButtonProps = ButtonProps & {
  payoutMethodType?: StripePayoutMethodType;
};

export function ConnectPayoutButton({
  payoutMethodType,
  ...props
}: ConnectPayoutButtonProps) {
  const router = useRouter();
  const { partner, payoutMethod } = usePartnerProfile();

  const { executeAsync: executeStripeAsync, isPending: isStripePending } =
    useAction(generateStripeAccountLink, {
      onSuccess: ({ data }) => {
        if (!data?.url) {
          toast.error("Unable to create account link. Please contact support.");
          return;
        }
        router.push(data.url);
      },
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
    });

  const { executeAsync: executePaypalAsync, isPending: isPaypalPending } =
    useAction(generatePaypalOAuthUrl, {
      onSuccess: ({ data }) => {
        if (!data?.url) {
          toast.error("Unable to redirect to Paypal. Please contact support.");
          return;
        }
        router.push(data.url);
      },
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
    });

  const connectPayout = useCallback(async () => {
    if (!partner) {
      toast.error("Invalid partner profile. Please log out and log back in.");
      return;
    }

    if (!partner.country) {
      toast.error(
        "You haven't set your country yet. Please go to partners.dub.co/settings to set your country.",
      );
      return;
    }

    if (payoutMethod === "paypal") {
      await executePaypalAsync();
    } else if (payoutMethod === "stripe") {
      await executeStripeAsync();
    } else {
      toast.error(
        "Your country is not supported for payout. Please go to partners.dub.co/settings to update your country, or contact support.",
      );
      return;
    }
  }, [executeStripeAsync, executePaypalAsync, partner, payoutMethod]);

  const { setShowBankAccountRequirementsModal, BankAccountRequirementsModal } =
    useBankAccountRequirementsModal({
      onContinue: connectPayout,
    });

  const { setShowChoosePayoutMethodModal, ChoosePayoutMethodModal } =
    useChoosePayoutMethodModal();

  const errorMessage = useMemo(
    () =>
      !partner?.country
        ? "You haven't set your country yet. Please update your country or contact support."
        : !payoutMethod
          ? `Your current country (${COUNTRIES[partner.country]}) is not supported for payout. Please update your country or contact support.`
          : undefined,
    [partner, payoutMethod],
  );

  const handleClick = useCallback(() => {
    if (payoutMethod === "paypal") {
      connectPayout();
      return;
    }

    if (payoutMethod === "stripe") {
      if (payoutMethodType === "stablecoin") {
        connectPayout();
      } else if (payoutMethodType === "bank_account") {
        setShowBankAccountRequirementsModal(true);
      } else {
        setShowChoosePayoutMethodModal(true);
      }
      return;
    }

    toast.error(
      "Your country is not supported for payout. Please go to partners.dub.co/settings to update your country, or contact support.",
    );
  }, [
    connectPayout,
    payoutMethod,
    payoutMethodType,
    setShowBankAccountRequirementsModal,
    setShowChoosePayoutMethodModal,
  ]);

  if (partner && !hasPermission(partner.role, "payout_settings.update")) {
    return null;
  }

  return (
    <>
      {BankAccountRequirementsModal}
      {payoutMethod === "stripe" &&
        !payoutMethodType &&
        ChoosePayoutMethodModal}
      <Button
        onClick={handleClick}
        loading={isStripePending || isPaypalPending}
        text={payoutMethod === "paypal" ? "Connect PayPal" : "Connect payout"}
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
