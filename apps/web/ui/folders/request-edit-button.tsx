"use client";

import { requestFolderEditAccessAction } from "@/lib/actions/request-folder-edit-access";
import { useFolderAccessRequests } from "@/lib/swr/use-folder-access-requests";
import { Button } from "@dub/ui";
import { cn } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

export const FolderEditAccessRequestButton = ({
  folderId,
  workspaceId,
  variant = "outline",
}: {
  folderId: string;
  workspaceId: string;
  variant?: "outline" | "primary";
}) => {
  const [requestSent, setRequestSent] = useState(false);
  const { accessRequests, isLoading } = useFolderAccessRequests();

  const { executeAsync, isExecuting } = useAction(
    requestFolderEditAccessAction,
    {
      onSuccess: () => {
        toast.success("Request sent to folder owner.");
        setRequestSent(true);
      },
      onError: ({ error }) => {
        toast.error(error.serverError?.serverError);
      },
    },
  );

  const isRequested = accessRequests?.some(
    (accessRequest) => accessRequest.folderId === folderId,
  );

  if (isLoading) {
    return null;
  }

  return (
    <Button
      text={
        isExecuting
          ? "Sending..."
          : requestSent || isRequested
            ? "Request sent"
            : "Request access"
      }
      variant={variant}
      className={cn(
        variant === "outline" &&
          "h-8 w-fit rounded-md border border-gray-200 text-gray-900",
      )}
      disabled={isRequested || requestSent}
      loading={isExecuting}
      onClick={() =>
        executeAsync({
          workspaceId,
          folderId,
        })
      }
    />
  );
};
