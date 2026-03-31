import { setDefaultFolderAction } from "@/lib/actions/folders/set-default-folder";
import useWorkspace from "@/lib/swr/use-workspace";
import { FolderSummary } from "@/lib/types";
import { Button, Modal } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";
import { SimpleFolderCard } from "../folders/simple-folder-card";

function SetDefaultFolderModal({
  showDefaultFolderModal,
  setShowDefaultFolderModal,
  folder,
}: {
  showDefaultFolderModal: boolean;
  setShowDefaultFolderModal: Dispatch<SetStateAction<boolean>>;
  folder: FolderSummary;
}) {
  const { id: workspaceId, slug } = useWorkspace();

  const { executeAsync, isPending } = useAction(setDefaultFolderAction, {
    onSuccess: async () => {
      setShowDefaultFolderModal(false);
      await Promise.all([
        mutate("/api/workspaces"),
        mutate(`/api/workspaces/${slug}`),
        mutate(`/api/folders?workspaceId=${workspaceId}`),
      ]);
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const setDefaultFolder = async () => {
    if (!workspaceId) return;

    await executeAsync({
      workspaceId,
      folderId: folder.id === "unsorted" ? null : folder.id,
    });
  };

  return (
    <Modal
      showModal={showDefaultFolderModal}
      setShowModal={setShowDefaultFolderModal}
    >
      <div className="space-y-2 border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          Set "{folder.name}" as your default folder
        </h3>
      </div>

      <div className="bg-neutral-50 p-4 sm:p-6">
        <p className="text-sm text-neutral-800">
          This will make this folder the default folder for your links
          dashboard.{" "}
          <a
            href="https://dub.co/help/article/link-folders#setting-a-default-folder"
            className="cursor-help text-neutral-700 underline decoration-dotted underline-offset-2 hover:text-neutral-900"
            target="_blank"
            rel="noreferrer"
          >
            Learn more.
          </a>
        </p>

        <div className="scrollbar-hide mt-4 flex max-h-[190px] flex-col gap-2 overflow-y-auto rounded-2xl border border-neutral-200 p-2">
          <SimpleFolderCard folder={folder} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-5 sm:px-6">
        <Button
          onClick={() => setShowDefaultFolderModal(false)}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
        />
        <Button
          onClick={() =>
            toast.promise(setDefaultFolder, {
              loading: `Setting ${folder.name} as the default folder...`,
              success: `Successfully set ${folder.name} as the default folder!`,
              error: (error) => {
                return error.message;
              },
            })
          }
          autoFocus
          loading={isPending}
          text="Set as default folder"
          className="h-8 w-fit px-3"
        />
      </div>
    </Modal>
  );
}

export function useDefaultFolderModal({ folder }: { folder: FolderSummary }) {
  const [showDefaultFolderModal, setShowDefaultFolderModal] = useState(false);

  const DefaultFolderModalCallback = useCallback(() => {
    return folder ? (
      <SetDefaultFolderModal
        showDefaultFolderModal={showDefaultFolderModal}
        setShowDefaultFolderModal={setShowDefaultFolderModal}
        folder={folder}
      />
    ) : null;
  }, [showDefaultFolderModal, setShowDefaultFolderModal, folder]);

  return useMemo(
    () => ({
      setShowDefaultFolderModal,
      DefaultFolderModal: DefaultFolderModalCallback,
    }),
    [setShowDefaultFolderModal, DefaultFolderModalCallback],
  );
}
