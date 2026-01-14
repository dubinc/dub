"use client";

import { markPartnerReferralClosedLostAction } from "@/lib/actions/referrals/mark-partner-referral-closed-lost";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { partnerReferralSchema } from "@/lib/zod/schemas/partner-referrals";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import * as z from "zod/v4";

type PartnerReferralProps = z.infer<typeof partnerReferralSchema>;

export function useMarkPartnerReferralClosedLostModal({
  referral,
}: {
  referral: PartnerReferralProps;
}) {
  const { id: workspaceId } = useWorkspace();

  const { executeAsync, isPending } = useAction(
    markPartnerReferralClosedLostAction,
    {
      onSuccess: async () => {
        toast.success("Partner referral marked as closed lost successfully!");
        mutatePrefix("/api/programs/partner-referrals");
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

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
