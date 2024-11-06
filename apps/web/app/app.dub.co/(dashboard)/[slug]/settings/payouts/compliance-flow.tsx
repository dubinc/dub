"use client";

import { refreshComplianceFlowAction } from "@/lib/actions/refresh-compliance-flow";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button } from "@dub/ui";
import { CreditCard } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

export const ComplianceFlow = () => {
  const { id: workspaceId } = useWorkspace();

  const { executeAsync, isExecuting } = useAction(refreshComplianceFlowAction, {
    async onSuccess({ data }) {
      if (!data?.link) {
        return;
      }

      window.open(data.link, "_blank");
    },
    onError({ error }) {
      toast.error(error.serverError?.serverError);
    },
  });

  const onSubmit = async () => {
    await executeAsync({ workspaceId: workspaceId! });
  };

  return (
    <>
      <div className="flex items-center gap-5 rounded-lg border bg-white p-5">
        <div className="hidden h-12 w-12 items-center justify-center rounded-full border border-neutral-300 sm:inline-flex">
          <CreditCard className="h-5 w-5 text-gray-600" />
        </div>

        <div className="flex grow flex-col gap-1">
          <div className="text-base font-semibold text-gray-700">
            Submit compliance information
          </div>
          <div className="text-sm text-neutral-500">
            A URL will be generated for you to submit your KYB compliance.
          </div>
        </div>

        <div>
          <Button
            text="Submit KYB compliance"
            onClick={onSubmit}
            loading={isExecuting}
          />
        </div>
      </div>
    </>
  );
};
