"use client";

import { markReferralClosedLostAction } from "@/lib/actions/referrals/mark-referral-closed-lost";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { referralSchema } from "@/lib/zod/schemas/referrals";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import * as z from "zod/v4";

type PartnerReferralProps = z.infer<typeof referralSchema>;

export function useMarkPartnerReferralClosedLostModal({
  referral,
}: {
  referral: PartnerReferralProps;
}) {
  const { id: workspaceId } = useWorkspace();

  const { executeAsync, isPending } = useAction(markReferralClosedLostAction, {
    onSuccess: async () => {
      toast.success("Partner referral marked as closed lost successfully!");
      mutatePrefix("/api/programs/referrals");
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
