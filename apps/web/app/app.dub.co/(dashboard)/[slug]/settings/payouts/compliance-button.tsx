"use client";

import { refreshComplianceFlowAction } from "@/lib/actions/refresh-compliance-flow";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

export const ComplianceButton = () => {
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
    <Button
      variant="secondary"
      text="Submit KYB compliance"
      onClick={onSubmit}
      loading={isExecuting}
      className="w-fit"
    />
  );
};
