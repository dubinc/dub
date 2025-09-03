"use client";

import { generatePaypalOAuthUrl } from "@/lib/actions/partners/generate-paypal-oauth-url";
import { generateStripeAccountLink } from "@/lib/actions/partners/generate-stripe-account-link";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { Button, ButtonProps, TooltipContent } from "@dub/ui";
import {
  CONNECT_SUPPORTED_COUNTRIES,
  COUNTRIES,
  PAYPAL_SUPPORTED_COUNTRIES,
} from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

export function ConnectPayoutButton(props: ButtonProps) {
  const router = useRouter();
  const { partner } = usePartnerProfile();

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

  const onClick = useCallback(async () => {
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

    if (PAYPAL_SUPPORTED_COUNTRIES.includes(partner.country)) {
      await executePaypalAsync();
    } else if (CONNECT_SUPPORTED_COUNTRIES.includes(partner.country)) {
      await executeStripeAsync();
    } else {
      toast.error(
        "Your country is not supported for payout. Please go to partners.dub.co/settings to update your country, or contact support.",
      );
      return;
    }
  }, [executeStripeAsync, executePaypalAsync, partner]);

  const errorMessage = useMemo(
    () =>
      !partner?.country
        ? "You haven't set your country yet. Please update your country or contact support."
        : ![
              ...CONNECT_SUPPORTED_COUNTRIES,
              ...PAYPAL_SUPPORTED_COUNTRIES,
            ].includes(partner.country)
          ? `Your current country (${COUNTRIES[partner.country]}) is not supported for payout. Please update your country or contact support.`
          : undefined,
    [partner?.country],
  );

  return (
    <Button
      onClick={onClick}
      loading={isStripePending || isPaypalPending}
      text={
        partner?.country && PAYPAL_SUPPORTED_COUNTRIES.includes(partner.country)
          ? "Connect PayPal"
          : "Connect bank account"
      }
      disabledTooltip={
        errorMessage && (
          <TooltipContent
            title={errorMessage}
            cta="Update profile settings"
            href="/settings"
          />
        )
      }
      {...props}
    />
  );
}
