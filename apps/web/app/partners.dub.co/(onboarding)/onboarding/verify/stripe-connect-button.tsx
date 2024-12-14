"use client";

import { createAccountLinkAction } from "@/lib/actions/partners/create-account-link";
import { Button } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

export default function StripeConnectButton() {
  const { executeAsync, isExecuting } = useAction(createAccountLinkAction, {
    onSuccess: ({ data }) => {
      if (!data?.url) {
        toast.error("Failed to redirect to Stripe");
        return;
      }
      window.location.href = data.url;
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  return (
    <Button
      text="Continue to Stripe"
      variant="primary"
      onClick={() => executeAsync()}
      loading={isExecuting}
    />
  );
}
