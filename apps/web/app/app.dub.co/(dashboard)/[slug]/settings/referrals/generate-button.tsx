"use client";

import { generateReferralLink } from "@/lib/actions/generate-referral-link";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button } from "@dub/ui";
import { Hyperlink } from "@dub/ui/src/icons";
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
      icon={<Hyperlink className="size-4" />}
      text="Generate Referral Link"
      className="w-auto"
      onClick={() => executeAsync({ workspaceId: workspaceId! })}
      loading={isExecuting || hasSucceeded}
    />
  );
}
