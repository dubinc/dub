"use client";

import { requestFolderEditAccessAction } from "@/lib/actions/folders/request-folder-edit-access";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { useFolderAccessRequests } from "@/lib/swr/use-folder-access-requests";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

export const RequestFolderEditAccessButton = ({
  folderId,
  workspaceId,
  variant = "outline",
}: {
  folderId: string;
  workspaceId: string;
  variant?: "outline" | "primary";
}) => {
  const { plan } = useWorkspace();
  const [requestSent, setRequestSent] = useState(false);
  const { accessRequests, isLoading } = useFolderAccessRequests();

  const { executeAsync, isPending } = useAction(requestFolderEditAccessAction, {
    onSuccess: async () => {
      toast.success("Request sent to folder owner.");
      setRequestSent(true);
      await mutate(
        (key) => typeof key === "string" && key.startsWith(`/api/folders`),
      );
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  const isRequested = accessRequests?.some(
    (accessRequest) => accessRequest.folderId === folderId,
  );

  const { canManageFolderPermissions } = getPlanCapabilities(plan);

  if (!canManageFolderPermissions || isLoading) {
    return null;
  }

  return (
    <Button
      text={
        isPending
          ? "Sending..."
          : requestSent || isRequested
            ? "Request sent"
            : "Ask to edit"
      }
      variant={variant}
      className={cn(
        variant === "outline" &&
          "h-8 w-fit rounded-md border border-neutral-200 text-neutral-900",
      )}
      disabled={isRequested || requestSent}
      loading={isPending}
      onClick={async () =>
        await executeAsync({
          workspaceId,
          folderId,
        })
      }
      disabledTooltip={
        isRequested
          ? "You already have a pending request to this folder."
          : undefined
      }
    />
  );
};
