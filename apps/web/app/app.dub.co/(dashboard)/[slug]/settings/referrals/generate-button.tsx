"use client";

import { generateReferralLink } from "@/lib/actions/generate-referral-link";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function GenerateButton() {
  const router = useRouter();
  const { id: workspaceId } = useWorkspace();

  const { executeAsync, isExecuting, hasSucceeded } = useAction(
    generateReferralLink,
    {
      onSuccess: () => {
        toast.success("Referral link generated.");
        router.refresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError?.serverError);
      },
    },
  );

  return (
    <Button
      text="Activate Referral Link"
      className="h-9 w-auto rounded-lg"
      onClick={() => executeAsync({ workspaceId: workspaceId! })}
      loading={isExecuting || hasSucceeded}
    />
  );
}
