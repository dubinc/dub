import useWorkspace from "@/lib/swr/use-workspace";
import { FolderSummary } from "@/lib/types";
import { Button, Modal } from "@dub/ui";
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

function DefaultFolderModal({
  showDefaultFolderModal,
  setShowDefaultFolderModal,
  folder,
}: {
  showDefaultFolderModal: boolean;
  setShowDefaultFolderModal: Dispatch<SetStateAction<boolean>>;
  folder: FolderSummary;
}) {
  const { id: workspaceId } = useWorkspace();
  const [loading, setLoading] = useState(false);

  const setDefault = async () => {
    setLoading(true);
    const response = await fetch(`/api/workspaces/${workspaceId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        defaultFolderId: folder.id === "unsorted" ? null : folder.id,
      }),
    });
    if (response.ok) {
      await Promise.all([
        mutate("/api/workspaces"),
        mutate(`/api/workspaces/${workspaceId}`),
        mutate(`/api/folders?workspaceId=${workspaceId}`),
      ]);
      setLoading(false);
      setShowDefaultFolderModal(false);
    } else {
      const { error } = await response.json();
      toast.error(error.message);
    }
  };

  return (
    <Modal
      showModal={showDefaultFolderModal}
      setShowModal={setShowDefaultFolderModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 text-center sm:px-16">
        <FolderIcon folder={folder} />
        <h3 className="text-lg font-medium">
          Set {folder.name} as default folder
        </h3>
        <p className="text-sm text-neutral-500">
          Setting this folder as default will make it the default view when
          accessing your links.
        </p>
      </div>

      <div className="flex flex-col space-y-6 bg-neutral-50 px-4 py-8 text-left sm:px-16">
        <Button
          onClick={() =>
            toast.promise(setDefault, {
              loading: `Setting ${folder.name} as the default folder...`,
              success: `Successfully set ${folder.name} as the default folder!`,
              error: (error) => {
                return error.message;
              },
            })
          }
          autoFocus
          loading={loading}
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
      <DefaultFolderModal
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
