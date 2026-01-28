"use client";

import { markReferralUnqualifiedAction } from "@/lib/actions/referrals/mark-referral-unqualified";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { ReferralProps } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

export function useUnqualifyReferralModal({
  referral,
}: {
  referral: ReferralProps;
}) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const { executeAsync, isPending } = useAction(markReferralUnqualifiedAction, {
    onSuccess: async () => {
      toast.success("Partner referral unqualified successfully!");
      mutatePrefix(`/api/programs/${defaultProgramId}/referrals`);
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Unqualify lead",
    description: "Are you sure you want to unqualify this partner referral?",
    confirmText: "Unqualify",
    cancelText: "Cancel",
    confirmShortcut: "U",
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
    setShowUnqualifyModal: setShowConfirmModal,
    UnqualifyModal: confirmModal,
    isUnqualifying: isPending,
  };
}
