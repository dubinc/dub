"use client";

import { createAccountLinkAction } from "@/lib/actions/partners/create-account-link";
import { generatePaypalOAuthUrl } from "@/lib/actions/partners/generate-paypal-oauth-url";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { Button, ButtonProps } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function PayoutConnectButton(props: ButtonProps) {
  const router = useRouter();
  const { partner } = usePartnerProfile();

  const { executeAsync: executeStripeAsync, isPending: isStripePending } =
    useAction(createAccountLinkAction, {
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

  const onClick = async () => {
    if (partner.supportedPayoutMethod === "stripe") {
      await executeStripeAsync();
    } else {
      await executePaypalAsync();
    }
  };

  return (
    <Button
      onClick={onClick}
      loading={isStripePending || isPaypalPending}
      {...props}
    />
  );
}
