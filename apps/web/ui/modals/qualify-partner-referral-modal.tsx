"use client";

import { qualifyPartnerReferralAction } from "@/lib/actions/partners/qualify-partner-referral";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { partnerReferralSchema } from "@/lib/zod/schemas/partner-referrals";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import * as z from "zod/v4";

type PartnerReferralProps = z.infer<typeof partnerReferralSchema>;

export function useQualifyPartnerReferralModal({
  referral,
}: {
  referral: PartnerReferralProps;
}) {
  const { id: workspaceId } = useWorkspace();

  const { executeAsync, isPending } = useAction(qualifyPartnerReferralAction, {
    onSuccess: async () => {
      toast.success("Partner referral qualified successfully!");
      mutatePrefix("/api/programs/partner-referrals");
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
