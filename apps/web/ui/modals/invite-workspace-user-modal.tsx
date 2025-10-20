import useWorkspace from "@/lib/swr/use-workspace";
import { Invite } from "@/lib/zod/schemas/invites";
import { Modal } from "@dub/ui";
import { LoadingSpinner } from "@dub/ui/icons";
import { fetcher } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import useSWR from "swr";
import { InviteTeammatesForm } from "../workspaces/invite-teammates-form";

function InviteWorkspaceUserModal({
  showInviteWorkspaceUserModal,
  setShowInviteWorkspaceUserModal,
  showSavedInvites,
}: {
  showInviteWorkspaceUserModal: boolean;
  setShowInviteWorkspaceUserModal: Dispatch<SetStateAction<boolean>>;
  showSavedInvites: boolean;
}) {
  const { id: workspaceId, plan } = useWorkspace();

  // we only need to fetch saved invites if the workspace is on the free plan
  // (or else we would've already sent the invites)
  const { data: invites, isLoading } = useSWR<Invite[]>(
    showInviteWorkspaceUserModal &&
      workspaceId &&
      plan === "free" &&
      showSavedInvites &&
      `/api/workspaces/${workspaceId}/invites/saved`,
    fetcher,
  );

  return (
    <Modal
      showModal={showInviteWorkspaceUserModal}
      setShowModal={setShowInviteWorkspaceUserModal}
      className="max-h-[95dvh]"
    >
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">Invite Teammates</h3>
        <p className="text-sm text-neutral-500">
          Invite teammates with{" "}
          <a
            href="https://dub.co/help/article/workspace-roles"
            target="_blank"
            className="underline hover:text-neutral-900"
          >
            different roles and permissions
          </a>
          . Invitations will be valid for 14 days.
        </p>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <LoadingSpinner />
        </div>
      ) : (
        <InviteTeammatesForm
          onSuccess={() => setShowInviteWorkspaceUserModal(false)}
          className="bg-neutral-50 px-4 py-4 sm:px-6"
          invites={invites}
        />
      )}
    </Modal>
  );
}

export function useInviteWorkspaceUserModal({
  showSavedInvites = false,
}: {
  showSavedInvites?: boolean;
} = {}) {
  const [showInviteWorkspaceUserModal, setShowInviteWorkspaceUserModal] =
    useState(false);

  const InviteWorkspaceUserModalCallback = useCallback(() => {
    return (
      <InviteWorkspaceUserModal
        showInviteWorkspaceUserModal={showInviteWorkspaceUserModal}
        setShowInviteWorkspaceUserModal={setShowInviteWorkspaceUserModal}
        showSavedInvites={showSavedInvites}
      />
    );
  }, [
    showInviteWorkspaceUserModal,
    setShowInviteWorkspaceUserModal,
    showSavedInvites,
  ]);

  return useMemo(
    () => ({
      setShowInviteWorkspaceUserModal,
      InviteWorkspaceUserModal: InviteWorkspaceUserModalCallback,
    }),
    [setShowInviteWorkspaceUserModal, InviteWorkspaceUserModalCallback],
  );
}
