"use client";

import { createAccountLinkAction } from "@/lib/actions/partners/create-account-link";
import { generatePaypalOAuthUrl } from "@/lib/actions/partners/generate-paypal-oauth-url";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { Button, ButtonProps } from "@dub/ui";
import { CONNECT_SUPPORTED_COUNTRIES, COUNTRIES } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useCallback } from "react";
import { toast } from "sonner";

export function ConnectPayoutButton(props: ButtonProps) {
  const { partner } = usePartnerProfile();

  const { executeAsync: executeStripeAsync, isPending: isStripePending } =
    useAction(createAccountLinkAction, {
      onSuccess: ({ data }) => {
        if (!data?.url) {
          toast.error("Unable to create account link. Please contact support.");
          return;
        }

        window.open(data.url, "_blank");
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

        window.open(data.url, "_blank");
      },
      onError: ({ error }) => {
        toast.error(error.serverError);
      },
    });

  const onClick = useCallback(async () => {
    if (!partner) {
      toast.error("Invalid partner profile. Please log out and log back in.");
      return;
    }

    // TODO: Uncomment this once PayPal connection is ready
    // if (partner.supportedPayoutMethod === "paypal") {
    //   await executePaypalAsync();
    // } else if (partner.supportedPayoutMethod === "stripe") {
    //   await executeStripeAsync();
    // } else {
    //   toast.error("Unable to connect payout method. Please contact support.");
    // }
    await executeStripeAsync();
  }, [executeStripeAsync, partner]);

  return (
    <Button
      onClick={onClick}
      loading={isStripePending || isPaypalPending}
      // TODO: Uncomment this once PayPal connection is ready
      disabledTooltip={
        partner?.country &&
        !CONNECT_SUPPORTED_COUNTRIES.includes(partner.country) &&
        `We currently do not support payouts for ${COUNTRIES[partner.country]} yet, but we are working on adding payouts support via PayPal soon.`
      }
      {...props}
    />
  );
}
