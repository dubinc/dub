import { PartnerUserProps } from "@/lib/swr/use-partner-profile-users";
import { Avatar, Button, Modal, useMediaQuery } from "@dub/ui";

import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { mutate } from "swr";

function RevokePartnerInviteModal({
  showRevokePartnerInviteModal,
  setShowRevokePartnerInviteModal,
  invite,
}: {
  showRevokePartnerInviteModal: boolean;
  setShowRevokePartnerInviteModal: Dispatch<SetStateAction<boolean>>;
  invite: PartnerUserProps;
}) {
  const { isMobile } = useMediaQuery();
  const [revoking, setRevoking] = useState(false);

  const revokePartnerInvite = async () => {
    setRevoking(true);

    const response = await fetch(
      `/api/partner-profile/invites?email=${encodeURIComponent(invite.email)}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      },
    );

    try {
      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error.message);
      }

      await mutate("/api/partner-profile/users");
      setShowRevokePartnerInviteModal(false);
      toast.success("Successfully revoked invitation!");
    } catch (error) {
      toast.error(error.message || "Failed to revoke invitation.");
    } finally {
      setRevoking(false);
    }
  };

  return (
    <Modal
      showModal={showRevokePartnerInviteModal}
      setShowModal={setShowRevokePartnerInviteModal}
      className="max-w-md"
    >
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">Revoke Invitation</h3>
        <p className="text-sm text-neutral-500">
          This will revoke{" "}
          <span className="font-semibold text-black">
            {invite.name || invite.email}
          </span>
          's invitation to join your partner profile. Are you sure you want to
          continue?
        </p>
      </div>

      <div className="flex flex-col space-y-4 bg-neutral-50 px-4 py-4 sm:px-6">
        <div className="relative flex items-center gap-2 space-x-3 rounded-md border border-neutral-300 bg-white px-4 py-2">
          <div className="flex items-center gap-2">
            <Avatar user={invite} className="size-10" />
            <div className="flex flex-col">
              <p className="text-content-subtle text-sm font-medium">
                {invite.email}
              </p>
            </div>
          </div>
        </div>

        <Button
          text="Revoke"
          variant="danger"
          autoFocus={!isMobile}
          loading={revoking}
          onClick={revokePartnerInvite}
        />
      </div>
    </Modal>
  );
}

export function useRevokePartnerInviteModal({
  invite,
}: {
  invite: PartnerUserProps;
}) {
  const [showRevokePartnerInviteModal, setShowRevokePartnerInviteModal] =
    useState(false);

  const RevokePartnerInviteModalCallback = useCallback(() => {
    return (
      <RevokePartnerInviteModal
        showRevokePartnerInviteModal={showRevokePartnerInviteModal}
        setShowRevokePartnerInviteModal={setShowRevokePartnerInviteModal}
        invite={invite}
      />
    );
  }, [showRevokePartnerInviteModal, setShowRevokePartnerInviteModal, invite]);

  return useMemo(
    () => ({
      setShowRevokePartnerInviteModal,
      RevokePartnerInviteModal: RevokePartnerInviteModalCallback,
    }),
    [setShowRevokePartnerInviteModal, RevokePartnerInviteModalCallback],
  );
}
