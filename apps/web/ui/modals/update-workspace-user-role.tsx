import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { UserProps } from "@/lib/types";
import { WorkspaceRole } from "@dub/prisma/client";
import { Avatar, Button, Modal, useMediaQuery } from "@dub/ui";
import { useSearchParams } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

function WorkspaceUserRoleModal({
  showWorkspaceUserRoleModal,
  setShowWorkspaceUserRoleModal,
  user,
  role,
}: {
  showWorkspaceUserRoleModal: boolean;
  setShowWorkspaceUserRoleModal: Dispatch<SetStateAction<boolean>>;
  user: UserProps;
  role: WorkspaceRole;
}) {
  const [editing, setEditing] = useState(false);
  const { id } = useWorkspace();
  const { id: userId, name, email } = user;
  const { isMobile } = useMediaQuery();

  const searchParams = useSearchParams();
  const isInvite = searchParams.get("status") === "invited";

  const updateRole = async () => {
    setEditing(true);

    try {
      const endpoint = isInvite
        ? `/api/workspaces/${id}/invites`
        : `/api/workspaces/${id}/users`;
      const body = isInvite ? { email, role } : { userId, role };

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error.message);
      }

      await mutatePrefix(
        `/api/workspaces/${id}/${isInvite ? "invites" : "users"}`,
      );
      setShowWorkspaceUserRoleModal(false);
      toast.success(`Successfully updated the role to ${role}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setEditing(false);
    }
  };

  return (
    <Modal
      showModal={showWorkspaceUserRoleModal}
      setShowModal={setShowWorkspaceUserRoleModal}
      className="max-w-md"
    >
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">
          {isInvite ? "Update Invitation Role" : "Update Member Role"}
        </h3>
        <p className="text-sm text-neutral-500">
          This will change{" "}
          <span className="font-semibold text-black">{name || email}</span>
          's role to <span className="font-semibold text-black">{role}</span>.
          Are you sure you want to continue?
        </p>
      </div>

      <div className="flex flex-col space-y-4 bg-neutral-50 px-4 py-4 sm:px-6">
        <div className="relative flex items-center gap-2 space-x-3 rounded-md border border-neutral-300 bg-white px-4 py-2">
          <div className="flex items-center gap-2">
            <Avatar user={user} className="size-10" />
            <div className="flex flex-col">
              {isInvite ? (
                <p className="text-content-subtle text-sm font-medium">
                  {user.email}
                </p>
              ) : (
                <>
                  <p className="text-sm font-medium text-neutral-900">
                    {user.name || user.email}
                  </p>
                  <p className="text-xs text-neutral-500">{user.email}</p>
                </>
              )}
            </div>
          </div>
        </div>

        <Button
          text="Confirm"
          autoFocus={!isMobile}
          loading={editing}
          onClick={updateRole}
        />
      </div>
    </Modal>
  );
}

export function useWorkspaceUserRoleModal({
  user,
  role,
}: {
  user: UserProps;
  role: WorkspaceRole;
}) {
  const [showWorkspaceUserRoleModal, setShowWorkspaceUserRoleModal] =
    useState(false);

  const WorkspaceUserRoleModalCallback = useCallback(() => {
    return (
      <WorkspaceUserRoleModal
        showWorkspaceUserRoleModal={showWorkspaceUserRoleModal}
        setShowWorkspaceUserRoleModal={setShowWorkspaceUserRoleModal}
        user={user}
        role={role}
      />
    );
  }, [showWorkspaceUserRoleModal, setShowWorkspaceUserRoleModal, user, role]);

  return useMemo(
    () => ({
      setShowWorkspaceUserRoleModal,
      WorkspaceUserRoleModal: WorkspaceUserRoleModalCallback,
    }),
    [setShowWorkspaceUserRoleModal, WorkspaceUserRoleModalCallback],
  );
}
