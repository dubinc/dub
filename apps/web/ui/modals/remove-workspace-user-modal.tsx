import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { TokenProps, UserProps } from "@/lib/types";
import { Avatar, Button, Modal, useMediaQuery } from "@dub/ui";
import { TriangleWarning } from "@dub/ui/icons";
import { fetcher, timeAgo } from "@dub/utils";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";

function RemoveWorkspaceUserModal({
  showRemoveWorkspaceUserModal,
  setShowRemoveWorkspaceUserModal,
  user,
}: {
  showRemoveWorkspaceUserModal: boolean;
  setShowRemoveWorkspaceUserModal: Dispatch<SetStateAction<boolean>>;
  user: Pick<UserProps, "id" | "name" | "email" | "image">;
}) {
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const { data: session } = useSession();
  const [removing, setRemoving] = useState(false);
  const [verification, setVerification] = useState("");
  const { id: workspaceId, name: workspaceName } = useWorkspace();

  const searchParams = useSearchParams();
  const isInvite = searchParams.get("status") === "invited";

  const { data: restrictedTokens } = useSWR<TokenProps[]>(
    `/api/tokens?workspaceId=${workspaceId}&userId=${user.id}`,
    fetcher<TokenProps[]>,
  );

  const removeWorkspaceUser = async () => {
    setRemoving(true);

    const response = await fetch(
      `/api/workspaces/${workspaceId}/${
        isInvite
          ? `invites?email=${encodeURIComponent(user.email)}`
          : `users?userId=${user.id}`
      }`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      },
    );

    if (response.status === 200) {
      if (session?.user?.email === user.email) {
        await mutate("/api/workspaces");
        router.push("/");
      } else {
        setShowRemoveWorkspaceUserModal(false);
        await mutatePrefix(
          `/api/workspaces/${workspaceId}/${isInvite ? "invites" : "users"}`,
        );
      }

      toast.success(
        session?.user?.email === user.email
          ? "You have left the workspace!"
          : isInvite
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

  const confirmationText = "confirm remove user";
  const isVerified = verification === confirmationText;

  const content = (
    <>
      {restrictedTokens && restrictedTokens.length > 0 && (
        <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex-shrink-0">
            <TriangleWarning className="size-5 text-amber-600" />
          </div>

          <h3 className="text-sm font-semibold leading-5 text-amber-900">
            Warning: Active tokens detected
          </h3>

          <p className="text-sm font-normal text-amber-900">
            {self ? "You have" : "This user has"} {restrictedTokens.length}{" "}
            active tokens. {self ? "Leaving" : "Removing this user"} will
            invalidate these tokens and may disrupt the integration.
          </p>

          <div>
            <ul className="mt-6 space-y-2">
              {restrictedTokens.map((token, index) => (
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
              {user.name || user.email}
            </p>
            <p className="text-xs text-neutral-500">{user.email}</p>
          </div>
        </div>
      </div>

      {!isInvite && (
        <div>
          <label
            htmlFor="verification"
            className="block text-sm text-neutral-700"
          >
            To verify, type{" "}
            <span className="font-semibold">{confirmationText}</span> below
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <input
              type="text"
              name="verification"
              id="verification"
              pattern={confirmationText}
              required
              autoFocus={!isMobile}
              autoComplete="off"
              value={verification}
              onChange={(e) => setVerification(e.target.value)}
              className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-300 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
            />
          </div>
        </div>
      )}

      <Button
        text={self ? "Leave" : isInvite ? "Revoke" : "Remove"}
        variant="danger"
        autoFocus={isInvite && !isMobile}
        loading={removing}
        disabled={!isInvite && !isVerified}
        onClick={isInvite ? removeWorkspaceUser : undefined}
      />
    </>
  );

  return (
    <Modal
      showModal={showRemoveWorkspaceUserModal}
      setShowModal={setShowRemoveWorkspaceUserModal}
      className="max-w-md"
    >
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">
          {isInvite
            ? "Revoke Invitation"
            : self
              ? "Leave Workspace"
              : "Remove Teammate"}
        </h3>
        <p className="text-sm text-neutral-500">
          {isInvite
            ? "This will revoke "
            : self
              ? "You're about to leave "
              : "This will remove "}
          <span className="font-semibold text-black">
            {self ? workspaceName : user.name || user.email}
          </span>
          {isInvite
            ? "'s invitation to join your workspace. "
            : self
              ? ". You will lose all access to this workspace. "
              : " from your workspace. "}
          Are you sure you want to continue?
        </p>
      </div>

      {isInvite ? (
        <div className="flex flex-col space-y-4 bg-neutral-50 px-4 py-4 sm:px-6">
          {content}
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await removeWorkspaceUser();
          }}
          className="flex flex-col space-y-4 bg-neutral-50 px-4 py-4 sm:px-6"
        >
          {content}
        </form>
      )}
    </Modal>
  );
}

export function useRemoveWorkspaceUserModal({ user }: { user: UserProps }) {
  const [showRemoveWorkspaceUserModal, setShowRemoveWorkspaceUserModal] =
    useState(false);

  const RemoveWorkspaceUserModalCallback = useCallback(() => {
    return (
      <RemoveWorkspaceUserModal
        showRemoveWorkspaceUserModal={showRemoveWorkspaceUserModal}
        setShowRemoveWorkspaceUserModal={setShowRemoveWorkspaceUserModal}
        user={user}
      />
    );
  }, [showRemoveWorkspaceUserModal, setShowRemoveWorkspaceUserModal, user]);

  return useMemo(
    () => ({
      setShowRemoveWorkspaceUserModal,
      RemoveWorkspaceUserModal: RemoveWorkspaceUserModalCallback,
    }),
    [setShowRemoveWorkspaceUserModal, RemoveWorkspaceUserModalCallback],
  );
}
