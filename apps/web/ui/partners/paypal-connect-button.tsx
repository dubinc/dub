"use client";

import { generatePaypalOAuthUrl } from "@/lib/actions/partners/generate-paypal-oauth-url";
import { Button, ButtonProps } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function PaypalConnectButton(props: ButtonProps) {
  const router = useRouter();

  const { executeAsync, isPending } = useAction(generatePaypalOAuthUrl, {
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
