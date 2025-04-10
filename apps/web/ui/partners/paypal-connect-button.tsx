"use client";

import { startPaypalOauthFlowAction } from "@/lib/actions/partners/start-paypal-oauth-flow";
import { Button, ButtonProps } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function PaypalConnectButton(props: ButtonProps) {
  const router = useRouter();

  const { executeAsync, isPending } = useAction(startPaypalOauthFlowAction, {
    onSuccess: ({ data }) => {
      if (!data?.url) {
        toast.error("Something went wrong. Please try again.");
        return;
      }

      router.push(data.url);
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  return (
    <Button onClick={() => executeAsync()} loading={isPending} {...props} />
  );
}
