"use client";

import { requestFolderEditAccessAction } from "@/lib/actions/request-folder-edit-access";
import { useFolderAccessRequests } from "@/lib/swr/use-folder-access-requests";
import { Button } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { toast } from "sonner";

export const FolderEditAccessRequestButton = ({
  folderId,
  workspaceId,
}: {
  folderId: string;
  workspaceId: string;
}) => {
  const [requestSent, setRequestSent] = useState(false);
  const { accessRequests } = useFolderAccessRequests();

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

  return (
    <Button
      text={
        isExecuting
          ? "Sending..."
          : requestSent || isRequested
            ? "Request sent"
            : "Ask to edit"
      }
      variant="outline"
      className="h-8 w-fit rounded-md border border-gray-200 text-gray-900"
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
