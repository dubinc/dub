import { Logo, Modal, useRouterStuff } from "@dub/ui";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { CreateWorkspaceForm } from "../workspaces/create-workspace-form";

function AddWorkspaceModalHelper({
  showAddWorkspaceModal,
  setShowAddWorkspaceModal,
}: {
  showAddWorkspaceModal: boolean;
  setShowAddWorkspaceModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const oauthFlow = pathname.startsWith("/oauth/authorize");

  const searchParams = useSearchParams();
  const { queryParams } = useRouterStuff();

  return (
    <Modal
      showModal={showAddWorkspaceModal}
      setShowModal={setShowAddWorkspaceModal}
      onClose={() => {
        if (searchParams.has("newWorkspace")) {
          queryParams({
            del: ["newWorkspace"],
          });
        }
      }}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 sm:px-16">
        <Logo />
        <h3 className="text-lg font-medium">Create a new workspace</h3>
        <a
          href="https://dub.co/help/article/what-is-a-workspace"
          target="_blank"
          className="-translate-y-2 text-center text-xs text-neutral-500 underline underline-offset-4 hover:text-neutral-800"
        >
          What is a workspace?
        </a>
      </div>

      <CreateWorkspaceForm
        className="bg-neutral-50 px-4 py-8 sm:px-16"
        onSuccess={({ slug }) => {
          if (oauthFlow) {
            router.refresh();
            setShowAddWorkspaceModal(false);
          } else {
            router.push(`/${slug}`);
            toast.success("Successfully created workspace!");
            setShowAddWorkspaceModal(false);
          }
        }}
      />
    </Modal>
  );
}

export function useAddWorkspaceModal() {
  const [showAddWorkspaceModal, setShowAddWorkspaceModal] = useState(false);

  const AddWorkspaceModal = useCallback(() => {
    return (
      <AddWorkspaceModalHelper
        showAddWorkspaceModal={showAddWorkspaceModal}
        setShowAddWorkspaceModal={setShowAddWorkspaceModal}
      />
    );
  }, [showAddWorkspaceModal, setShowAddWorkspaceModal]);

  return useMemo(
    () => ({ setShowAddWorkspaceModal, AddWorkspaceModal }),
    [setShowAddWorkspaceModal, AddWorkspaceModal],
  );
}
