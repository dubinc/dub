"use client";

import { createDotsFlowAction } from "@/lib/actions/partners/create-dots-flow";
import usePayoutMethods from "@/lib/swr/use-payout-methods";
import { Button } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import { toast } from "sonner";

export function PayoutsSettingsPageClient() {
  const { partnerId } = useParams() as { partnerId: string };

  // TODO: [dots] actually list payout methods
  const { data: payoutMethods } = usePayoutMethods({ partnerId });

  const { executeAsync, isExecuting } = useAction(createDotsFlowAction, {
    onError({ error }) {
      toast.error(error.serverError?.serverError);
    },
  });

  return (
    <div>
      <Button
        text="Manage payout methods"
        onClick={async () => {
          const result = await executeAsync({ partnerId });
          console.log(result);
          if (!result?.data?.ok || !("link" in result?.data)) {
            toast.error("Failed to start payout method connection flow");
            return;
          }

          toast.success("Starting Dots flow...");
          window.open(result.data.link, "_blank");
        }}
        className="w-fit"
      />
    </div>
  );
}
