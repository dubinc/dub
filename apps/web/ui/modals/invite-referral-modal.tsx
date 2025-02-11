"use client";

import { sendInviteReferralEmail } from "@/lib/actions/send-invite-referral-email";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Logo, Modal, useMediaQuery } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

function InviteReferralModal({
  showInviteReferralModal,
  setShowInviteReferralModal,
}: {
  showInviteReferralModal: boolean;
  setShowInviteReferralModal: Dispatch<SetStateAction<boolean>>;
}) {
  const [email, setEmail] = useState("");
  const { id: workspaceId } = useWorkspace();
  const { isMobile } = useMediaQuery();

  const { execute, isPending } = useAction(sendInviteReferralEmail, {
    onSuccess: () => {
      toast.success("Invitation sent.");
      setShowInviteReferralModal(false);
    },
    onError: ({ error }) => {
      toast.error(error.serverError);
    },
  });

  return (
    <Modal
      showModal={showInviteReferralModal}
      setShowModal={setShowInviteReferralModal}
    >
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-4 pt-8 sm:px-16">
        <Logo />
        <h3 className="text-lg font-medium">Invite via Email</h3>
        <p className="text-center text-sm text-neutral-500">
          Invite a friend or colleague to use Dub with your referral link.
        </p>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          execute({ email, workspaceId: workspaceId! });
        }}
        className="flex flex-col space-y-4 bg-neutral-50 px-4 py-8 text-left sm:px-16"
      >
        <div>
          <label htmlFor="email" className="block text-sm text-neutral-700">
            Email
          </label>
          <div className="relative mt-1 rounded-md shadow-sm">
            <input
              type="email"
              name="email"
              id="email"
              placeholder="panic@thedis.co"
              autoFocus={!isMobile}
              autoComplete="off"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
            />
          </div>
          <p className="mt-2 text-xs text-neutral-500">
            Your name and email address will be shared in this invitation.
          </p>
        </div>
        <Button loading={isPending} text="Send invite" />
      </form>
    </Modal>
  );
}

export function useInviteReferralModal() {
  const [showInviteReferralModal, setShowInviteReferralModal] = useState(false);

  const InviteReferralModalCallback = useCallback(() => {
    return (
      <InviteReferralModal
        showInviteReferralModal={showInviteReferralModal}
        setShowInviteReferralModal={setShowInviteReferralModal}
      />
    );
  }, [showInviteReferralModal, setShowInviteReferralModal]);

  return useMemo(
    () => ({
      setShowInviteReferralModal,
      InviteReferralModal: InviteReferralModalCallback,
    }),
    [setShowInviteReferralModal, InviteReferralModalCallback],
  );
}
