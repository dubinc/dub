import useWorkspace from "@/lib/swr/use-workspace";
import { UserProps } from "@/lib/types";
import { Avatar, Button, Modal, useMediaQuery } from "@dub/ui";
import { TriangleWarning } from "@dub/ui/icons";
import { timeAgo } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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
  user: UserProps & { restrictedTokens?: { name: string; lastUsed: Date }[] };
  invite?: boolean;
}) {
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const { data: session } = useSession();
  const [removing, setRemoving] = useState(false);
  const { id: workspaceId, name: workspaceName } = useWorkspace();

  const removeTeammate = async () => {
    setRemoving(true);

    const response = await fetch(
      `/api/workspaces/${workspaceId}/${
        invite
          ? `invites?email=${encodeURIComponent(user.email)}`
          : `users?userId=${user.id}`
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

      if (session?.user?.email === user.email) {
        await mutate("/api/workspaces");
        router.push("/");
      } else {
        setShowRemoveTeammateModal(false);
      }

      toast.success(
        session?.user?.email === user.email
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

  const self = session?.user?.email === user.email;

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
            : self
              ? "Leave Workspace"
              : "Remove Teammate"}
        </h3>
        <p className="text-sm text-neutral-500">
          {invite
            ? "This will revoke "
            : self
              ? "You're about to leave "
              : "This will remove "}
          <span className="font-semibold text-black">
            {self ? workspaceName : user.name || user.email}
          </span>
          {invite
            ? "'s invitation to join your workspace. "
            : self
              ? ". You will lose all access to this workspace. "
              : " from your workspace. "}
          Are you sure you want to continue?
        </p>
      </div>

      <div className="flex flex-col space-y-4 bg-neutral-50 px-4 py-4 sm:px-6">
        {user.restrictedTokens && user.restrictedTokens.length > 0 && (
          <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex-shrink-0">
              <TriangleWarning className="size-5 text-amber-400" />
            </div>

            <h3 className="text-sm font-semibold leading-5 text-amber-900">
              Warning: Active tokens detected
            </h3>

            <p className="text-sm font-normal text-amber-900">
              {self ? "You have" : "This user has"}{" "}
              {user.restrictedTokens.length} active tokens.{" "}
              {self ? "Leaving" : "Removing this user"} will invalidate these
              tokens and may disrupt the integration.
            </p>

            <div>
              <ul className="mt-6 space-y-2">
                {user.restrictedTokens.map((token, index) => (
                  <li key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium leading-4 text-amber-900">
                      {token.name}
                    </span>
                    <span className="text-xs font-normal leading-4 text-amber-700">
                      used {timeAgo(token.lastUsed, { withAgo: true })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="relative flex items-center gap-2 space-x-3 rounded-md border border-neutral-300 bg-white px-4 py-2">
          <div className="flex items-center gap-2">
            <Avatar user={user} className="size-10" />
            <div className="flex flex-col">
              <p className="text-sm font-medium text-neutral-900">
                {user.name}
              </p>
              <p className="text-xs text-neutral-500">{user.email}</p>
            </div>
          </div>
        </div>

        <Button
          text={self ? "Leave" : "Remove"}
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
  user: UserProps & { restrictedTokens?: { name: string; lastUsed: Date }[] };
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
