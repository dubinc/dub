import { mutatePrefix } from "@/lib/swr/mutate";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { PartnerUserProps } from "@/lib/swr/use-partner-profile-users";
import { PartnerRole } from "@dub/prisma/client";
import { Avatar, BlurImage, Button, Logo, Modal } from "@dub/ui";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";

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
  const [updating, setUpdating] = useState(false);
  const { partner } = usePartnerProfile();
  const { id: userId, name, email } = user;

  const updateRole = async () => {
    setUpdating(true);

    try {
      const response = await fetch("/api/partner-profile/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          role,
        }),
      });

      if (response.ok) {
        await mutatePrefix("/api/partner-profile/users");
        setShowUpdateUserModal(false);
        toast.success(
          `Successfully changed ${name || email}'s role to ${role}.`,
        );
      } else {
        const { error } = await response.json();
        toast.error(error.message);
      }
    } catch (error) {
      toast.error("Failed to update role");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Modal showModal={showUpdateUserModal} setShowModal={setShowUpdateUserModal}>
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 sm:px-16">
        {partner?.image ? (
          <BlurImage
            src={partner.image}
            alt="Partner logo"
            className="h-10 w-10 rounded-full"
            width={20}
            height={20}
          />
        ) : (
          <Logo />
        )}
        <h3 className="text-lg font-medium">Change Partner Role</h3>
        <p className="text-center text-sm text-neutral-500">
          This will change <b className="text-neutral-800">{name || email}</b>'s
          role in <b className="text-neutral-800">{partner?.name}</b> to{" "}
          <b className="text-neutral-800">{role}</b>. Are you sure you want to
          continue?
        </p>
      </div>

      <div className="flex flex-col space-y-4 bg-neutral-50 px-4 py-8 text-left sm:px-16">
        <div className="flex items-center space-x-3 rounded-md border border-neutral-300 bg-white p-3">
          <Avatar user={user} />
          <div className="flex flex-col">
            <h3 className="text-sm font-medium">{name || email}</h3>
            <p className="text-xs text-neutral-500">{email}</p>
          </div>
        </div>
        <Button text="Confirm" loading={updating} onClick={updateRole} />
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

