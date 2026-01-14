"use client";

import { unqualifyPartnerReferralAction } from "@/lib/actions/partners/unqualify-partner-referral";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { partnerReferralSchema } from "@/lib/zod/schemas/partner-referrals";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import * as z from "zod/v4";

type PartnerReferralProps = z.infer<typeof partnerReferralSchema>;

export function useUnqualifyPartnerReferralModal({
  referral,
}: {
  referral: PartnerReferralProps;
}) {
  const { id: workspaceId } = useWorkspace();

  const { executeAsync, isPending } = useAction(
    unqualifyPartnerReferralAction,
    {
      onSuccess: async () => {
        toast.success("Partner referral unqualified successfully!");
        mutatePrefix("/api/programs/partner-referrals");
      },
      onError({ error }) {
        toast.error(error.serverError);
      },
    },
  );

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
