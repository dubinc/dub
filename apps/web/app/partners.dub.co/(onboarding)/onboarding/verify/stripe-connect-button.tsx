"use client";

import { createAccountLinkAction } from "@/lib/actions/partners/create-account-link";
import { Button } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function StripeConnectButton() {
  const router = useRouter();
  const { executeAsync, isExecuting } = useAction(createAccountLinkAction, {
    onSuccess: ({ data }) => {
      if (!data?.url) {
        toast.error("Unable to create account link. Please contact support.");
        return;
      }

      window.open(data.url, "_blank");
      router.push("/programs");
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
