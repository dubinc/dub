"use client";

import { createAccountLinkAction } from "@/lib/actions/partners/create-account-link";
import { Button, ButtonProps } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

export default function StripeConnectButton(props: ButtonProps) {
  const { executeAsync, isPending } = useAction(createAccountLinkAction, {
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

  return (
    <Button onClick={() => executeAsync()} loading={isPending} {...props} />
  );
}
