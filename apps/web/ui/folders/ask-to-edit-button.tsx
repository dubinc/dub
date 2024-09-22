"use client";

import { requestFolderEditAccessAction } from "@/lib/actions/request-folder-edit-access";
import { Folder } from "@/lib/link-folder/types";
import { Button } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

interface AskToEditButtonProps {
  folder: Folder;
  workspaceId: string;
}

export const AskToEditButton = ({
  folder,
  workspaceId,
}: AskToEditButtonProps) => {
  const { executeAsync, isExecuting } = useAction(
    requestFolderEditAccessAction,
    {
      onSuccess: () => {
        toast.success("Request sent to folder owner.");
      },
      onError: ({ error }) => {
        toast.error(error.serverError?.serverError);
      },
    },
  );

  return (
    <Button
      text={isExecuting ? "Sending..." : "Ask to edit"}
      variant="outline"
      className="h-8 w-fit rounded-md border border-gray-200 text-gray-900"
      disabled={isExecuting}
      loading={isExecuting}
      onClick={() =>
        executeAsync({
          workspaceId: workspaceId!,
          folderId: folder.id,
        })
      }
    />
  );
};
