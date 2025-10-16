import { mutatePrefix } from "@/lib/swr/mutate";
import { PartnerUserProps } from "@/lib/types";
import { PartnerRole } from "@dub/prisma/client";
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

function UpdatePartnerUserModal({
  showUpdateUserModal,
  setShowUpdateUserModal,
  user,
  role,
}: {
  showUpdateUserModal: boolean;
  setShowUpdateUserModal: Dispatch<SetStateAction<boolean>>;
  user: PartnerUserProps;
  role: PartnerRole;
}) {
  const { isMobile } = useMediaQuery();
  const [updating, setUpdating] = useState(false);
  const { id: userId, name, email } = user;

  const searchParams = useSearchParams();
  const isInvite = searchParams.get("status") === "invited";

  const updateRole = async () => {
    setUpdating(true);

    try {
      const endpoint = isInvite
        ? "/api/partner-profile/invites"
        : "/api/partner-profile/users";
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
        `/api/partner-profile/${isInvite ? "invites" : "users"}`,
      );
      setShowUpdateUserModal(false);
      toast.success(`Successfully updated the role to ${role}.`);
    } catch (error) {
      toast.error(error.message || "Failed to update role.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Modal
      showModal={showUpdateUserModal}
      setShowModal={setShowUpdateUserModal}
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
          loading={updating}
          onClick={updateRole}
        />
      </div>
    </Modal>
  );
}

export function useUpdatePartnerUserModal({
  user,
  role,
}: {
  user: PartnerUserProps;
  role: PartnerRole;
}) {
  const [showUpdateUserModal, setShowUpdateUserModal] = useState(false);

  const UpdateUserModalCallback = useCallback(() => {
    return (
      <UpdatePartnerUserModal
        showUpdateUserModal={showUpdateUserModal}
        setShowUpdateUserModal={setShowUpdateUserModal}
        user={user}
        role={role}
      />
    );
  }, [showUpdateUserModal, setShowUpdateUserModal, user, role]);

  return useMemo(
    () => ({
      setShowUpdateUserModal,
      UpdateUserModal: UpdateUserModalCallback,
    }),
    [setShowUpdateUserModal, UpdateUserModalCallback],
  );
}
