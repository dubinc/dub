"use client";

import { markReferralClosedLostAction } from "@/lib/actions/referrals/mark-referral-closed-lost";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { ReferralProps } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

export function useMarkReferralClosedLostModal({
  referral,
}: {
  referral: ReferralProps;
}) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const { executeAsync, isPending } = useAction(markReferralClosedLostAction, {
    onSuccess: async () => {
      toast.success("Partner referral marked as closed lost successfully!");
      mutatePrefix(`/api/programs/${defaultProgramId}/referrals`);
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Lead closed lost",
    description:
      "Are you sure you want to mark this partner referral as closed lost?",
    confirmText: "Closed lost",
    cancelText: "Cancel",
    confirmShortcut: "L",
    confirmShortcutOptions: { modal: true },
    onConfirm: async () => {
      if (!workspaceId || !referral.id) {
        return;
      }

      await executeAsync({
        workspaceId,
        referralId: referral.id,
      });
    },
  });

  return {
    setShowClosedLostModal: setShowConfirmModal,
    ClosedLostModal: confirmModal,
    isMarkingClosedLost: isPending,
  };
}
