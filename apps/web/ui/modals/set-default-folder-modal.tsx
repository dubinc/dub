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
import { FolderIcon } from "../folders/folder-icon";

function SetDefaultFolderModal({
  showDefaultFolderModal,
  setShowDefaultFolderModal,
  folder,
}: {
  showDefaultFolderModal: boolean;
  setShowDefaultFolderModal: Dispatch<SetStateAction<boolean>>;
  folder: FolderSummary;
}) {
  const { id: workspaceId } = useWorkspace();

  const { executeAsync, isPending } = useAction(setDefaultFolderAction, {
    onSuccess: async () => {
      setShowDefaultFolderModal(false);
      await Promise.all([
        mutate("/api/workspaces"),
        mutate(`/api/workspaces/${workspaceId}`),
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
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 text-center sm:px-16">
        <FolderIcon folder={folder} />
        <h3 className="text-lg font-medium">
          Set "{folder.name}" as your default folder
        </h3>
        <p className="text-sm text-neutral-500">
          This will make this folder the default folder for your links
          dashboard.{" "}
          <a
            // TODO: Update help article when ready
            href="https://dub.co/help"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            Learn more ↗
          </a>
        </p>
      </div>

      <div className="flex flex-col space-y-6 bg-neutral-50 px-4 py-8 text-left sm:px-16">
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
