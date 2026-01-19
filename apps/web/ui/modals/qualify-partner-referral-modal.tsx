"use client";

import { markReferralQualifiedAction } from "@/lib/actions/referrals/mark-referral-qualified";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { referralSchema } from "@/lib/zod/schemas/referrals";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import * as z from "zod/v4";

type PartnerReferralProps = z.infer<typeof referralSchema>;

export function useQualifyPartnerReferralModal({
  referral,
}: {
  referral: PartnerReferralProps;
}) {
  const { id: workspaceId } = useWorkspace();

  const { executeAsync, isPending } = useAction(markReferralQualifiedAction, {
    onSuccess: async () => {
      toast.success("Partner referral qualified successfully!");
      mutatePrefix("/api/programs/referrals");
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const { setShowConfirmModal, confirmModal } = useConfirmModal({
    title: "Qualify lead",
    description: "Are you sure you want to qualify this partner referral?",
    confirmText: "Qualify",
    cancelText: "Cancel",
    confirmShortcut: "Q",
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
    setShowQualifyModal: setShowConfirmModal,
    QualifyModal: confirmModal,
    isQualifying: isPending,
  };
}
