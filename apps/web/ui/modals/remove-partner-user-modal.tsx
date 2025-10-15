import { mutatePrefix } from "@/lib/swr/mutate";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PartnerUserProps } from "@/lib/types";
import { Avatar, Button, Modal, useMediaQuery } from "@dub/ui";
import { signOut, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

function RemovePartnerUserModal({
  showRemovePartnerUserModal,
  setShowRemovePartnerUserModal,
  user,
}: {
  showRemovePartnerUserModal: boolean;
  setShowRemovePartnerUserModal: Dispatch<SetStateAction<boolean>>;
  user: PartnerUserProps;
}) {
  const { isMobile } = useMediaQuery();
  const { data: session } = useSession();
  const [removing, setRemoving] = useState(false);
  const { partner } = usePartnerProfile();

  const self = session?.user?.email === user.email;

  const searchParams = useSearchParams();
  const isInvite = searchParams.get("status") === "invited";

  const removePartnerUser = async () => {
    setRemoving(true);

    try {
      const response = await fetch(
        isInvite
          ? `/api/partner-profile/invites?email=${encodeURIComponent(user.email)}`
          : `/api/partner-profile/users?userId=${user.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error.message);
      }

      if (self) {
        toast.success("You have left the partner profile!");
        await signOut({ callbackUrl: "/" });
        return;
      }

      setShowRemovePartnerUserModal(false);
      toast.success(
        isInvite
          ? "Successfully revoked invitation!"
          : "Successfully removed partner member!",
      );
      await mutatePrefix(
        `/api/partner-profile/${isInvite ? "invites" : "users"}`,
      );
    } catch (error) {
      toast.error(
        error?.message ||
          (isInvite
            ? "Failed to revoke invitation."
            : "Failed to remove partner member."),
      );
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Modal
      showModal={showRemovePartnerUserModal}
      setShowModal={setShowRemovePartnerUserModal}
      className="max-w-md"
    >
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">
          {isInvite
            ? "Revoke Invitation"
            : self
              ? "Leave Partner Team"
              : "Remove Partner Member"}
        </h3>
        <p className="text-sm text-neutral-500">
          {isInvite ? (
            <>
              This will revoke{" "}
              <span className="font-semibold text-black">
                {user.name || user.email}
              </span>
              's invitation to join your partner profile. Are you sure you want
              to continue?
            </>
          ) : (
            <>
              {self ? "You're about to leave " : "This will remove "}
              <span className="font-semibold text-black">
                {self ? partner?.name : user.name || user.email}
              </span>
              {self
                ? ". You will lose all access to this partner profile. "
                : " from your partner profile. "}
              Are you sure you want to continue?
            </>
          )}
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
          text={isInvite ? "Revoke" : self ? "Leave" : "Remove"}
          variant="danger"
          autoFocus={!isMobile}
          loading={removing}
          onClick={removePartnerUser}
        />
      </div>
    </Modal>
  );
}

export function useRemovePartnerUserModal({
  user,
}: {
  user: PartnerUserProps;
}) {
  const [showRemovePartnerUserModal, setShowRemovePartnerUserModal] =
    useState(false);

  const RemovePartnerUserModalCallback = useCallback(() => {
    return (
      <RemovePartnerUserModal
        showRemovePartnerUserModal={showRemovePartnerUserModal}
        setShowRemovePartnerUserModal={setShowRemovePartnerUserModal}
        user={user}
      />
    );
  }, [showRemovePartnerUserModal, setShowRemovePartnerUserModal, user]);

  return useMemo(
    () => ({
      setShowRemovePartnerUserModal,
      RemovePartnerUserModal: RemovePartnerUserModalCallback,
    }),
    [setShowRemovePartnerUserModal, RemovePartnerUserModalCallback],
  );
}
