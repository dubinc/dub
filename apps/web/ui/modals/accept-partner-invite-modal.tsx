import { mutatePrefix } from "@/lib/swr/mutate";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { Button, Logo, Modal } from "@dub/ui";
import { useRouter } from "next/navigation";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

function AcceptPartnerInviteModal({
  showAcceptPartnerInviteModal,
  setShowAcceptPartnerInviteModal,
}: {
  showAcceptPartnerInviteModal: boolean;
  setShowAcceptPartnerInviteModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const { partner, error } = usePartnerProfile();
  const [accepting, setAccepting] = useState(false);

  const handleAcceptInvite = async () => {
    setAccepting(true);

    try {
      const response = await fetch(`/api/partner-profile/invites/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      await mutatePrefix("/api/partner-profile");
      router.replace("/programs");
      setShowAcceptPartnerInviteModal(false);
      toast.success("You are now a member of this partner profile!");
    } catch (error) {
      setAccepting(false);
      toast.error(error.message || "Failed to accept invite.");
    }
  };

  // Show the invite acceptance UI if no partner profile exists
  const showInviteUI = !partner && !error;

  return (
    <Modal
      showModal={showAcceptPartnerInviteModal}
      setShowModal={setShowAcceptPartnerInviteModal}
      preventDefaultClose
    >
      {showInviteUI ? (
        <>
          <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 sm:px-16">
            <Logo />
            <h3 className="text-lg font-medium">Partner Profile Invitation</h3>
            <p className="text-center text-sm text-neutral-500">
              You've been invited to join a partner profile on Dub Partners.
            </p>
          </div>
          <div className="flex flex-col space-y-6 bg-neutral-50 px-4 py-8 text-left sm:px-16">
            <Button
              onClick={handleAcceptInvite}
              loading={accepting}
              text="Accept invite"
            />
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 sm:px-16">
            <Logo />
            <h3 className="text-lg font-medium">
              Partner Profile Invitation Expired
            </h3>
            <p className="text-center text-sm text-neutral-500">
              This invite has expired or is no longer valid.
            </p>
          </div>
          <div className="flex flex-col space-y-6 bg-neutral-50 px-4 py-8 text-left sm:px-16">
            <Button
              text="Back to dashboard"
              onClick={() => {
                router.push("/programs");
                setShowAcceptPartnerInviteModal(false);
              }}
            />
          </div>
        </>
      )}
    </Modal>
  );
}

export function useAcceptPartnerInviteModal() {
  const [showAcceptPartnerInviteModal, setShowAcceptPartnerInviteModal] =
    useState(false);

  const AcceptPartnerInviteModalCallback = useCallback(() => {
    return (
      <AcceptPartnerInviteModal
        showAcceptPartnerInviteModal={showAcceptPartnerInviteModal}
        setShowAcceptPartnerInviteModal={setShowAcceptPartnerInviteModal}
      />
    );
  }, [showAcceptPartnerInviteModal, setShowAcceptPartnerInviteModal]);

  return useMemo(
    () => ({
      setShowAcceptPartnerInviteModal,
      AcceptPartnerInviteModal: AcceptPartnerInviteModalCallback,
    }),
    [setShowAcceptPartnerInviteModal, AcceptPartnerInviteModalCallback],
  );
}
