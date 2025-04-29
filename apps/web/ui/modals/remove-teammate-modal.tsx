import useWorkspace from "@/lib/swr/use-workspace";
import { UserProps } from "@/lib/types";
import { Button, Key, Modal, useMediaQuery } from "@dub/ui";
import { useSession } from "next-auth/react";
import { useRouter } from "next/router";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";

function RemoveTeammateModal({
  showRemoveTeammateModal,
  setShowRemoveTeammateModal,
  user,
  invite,
}: {
  showRemoveTeammateModal: boolean;
  setShowRemoveTeammateModal: Dispatch<SetStateAction<boolean>>;
  user: UserProps;
  invite?: boolean;
}) {
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const { data: session } = useSession();
  const [removing, setRemoving] = useState(false);
  const { id: workspaceId, name: workspaceName, logo } = useWorkspace();

  const { id, name, email } = user;

  const removeTeammate = async () => {
    setRemoving(true);

    const response = await fetch(
      `/api/workspaces/${workspaceId}/${
        invite
          ? `invites?email=${encodeURIComponent(email)}`
          : `users?userId=${id}`
      }`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (response.status === 200) {
      await mutate(
        `/api/workspaces/${workspaceId}/${invite ? "invites" : "users"}`,
      );

      if (session?.user?.email === email) {
        await mutate("/api/workspaces");
        router.push("/");
      } else {
        setShowRemoveTeammateModal(false);
      }

      toast.success(
        session?.user?.email === email
          ? "You have left the workspace!"
          : invite
            ? "Successfully revoked invitation!"
            : "Successfully removed teammate!",
      );
    } else {
      const { error } = await response.json();
      toast.error(error.message);
    }

    setRemoving(false);
  };

  return (
    <Modal
      showModal={showRemoveTeammateModal}
      setShowModal={setShowRemoveTeammateModal}
      className="max-w-md"
    >
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">
          {invite
            ? "Revoke Invitation"
            : session?.user?.email === email
              ? "Leave Workspace"
              : "Remove Teammate"}
        </h3>
        <p className="text-sm text-neutral-500">
          {invite
            ? "This will revoke "
            : session?.user?.email === email
              ? "You're about to leave "
              : "This will remove "}
          <span className="font-semibold text-black">
            {session?.user?.email === email ? workspaceName : name || email}
          </span>
          {invite
            ? "'s invitation to join your workspace. "
            : session?.user?.email === email
              ? ". You will lose all access to this workspace. "
              : " from your workspace. "}
          Are you sure you want to continue?
        </p>
      </div>

      <div className="flex flex-col space-y-4 bg-neutral-50 px-4 py-4 sm:px-6">
        <div className="relative flex items-center gap-2 space-x-3 rounded-md border border-neutral-300 bg-white px-4 py-2">
          <Key className="size-5 text-neutral-500" />

          {/* <div className="flex flex-1 flex-col gap-0.5">
            <h3 className="line-clamp-1 text-sm font-medium text-neutral-600">
              {token.name}
            </h3>
            <p
              className="text-xs font-medium text-neutral-500"
              suppressHydrationWarning
            >
              {token.partialKey}
            </p>
          </div> */}

          {/* <div className="flex items-center gap-2">
            {token.user && (
              <Tooltip content={token.user.name}>
                <img
                  src={
                    token.user.isMachine
                      ? "https://api.dicebear.com/7.x/bottts/svg?seed=Sara"
                      : token.user.image || `${OG_AVATAR_URL}${token.user.id}`
                  }
                  alt={token.user.name!}
                  className="size-5 rounded-full"
                />
              </Tooltip>
            )}
            <p className="text-xs text-neutral-500">
              {new Date(token.createdAt).toLocaleDateString("en-us", {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div> */}
        </div>

        <Button
          text="Delete"
          variant="danger"
          autoFocus={!isMobile}
          loading={removing}
          onClick={removeTeammate}
        />
      </div>
    </Modal>
  );
}

export function useRemoveTeammateModal({
  user,
  invite,
}: {
  user: UserProps;
  invite?: boolean;
}) {
  const [showRemoveTeammateModal, setShowRemoveTeammateModal] = useState(false);

  const RemoveTeammateModalCallback = useCallback(() => {
    return (
      <RemoveTeammateModal
        showRemoveTeammateModal={showRemoveTeammateModal}
        setShowRemoveTeammateModal={setShowRemoveTeammateModal}
        user={user}
        invite={invite}
      />
    );
  }, [showRemoveTeammateModal, setShowRemoveTeammateModal]);

  return useMemo(
    () => ({
      setShowRemoveTeammateModal,
      RemoveTeammateModal: RemoveTeammateModalCallback,
    }),
    [setShowRemoveTeammateModal, RemoveTeammateModalCallback],
  );
}
