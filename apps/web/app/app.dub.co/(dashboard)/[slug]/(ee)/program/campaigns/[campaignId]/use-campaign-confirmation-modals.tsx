import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { Campaign, UpdateCampaignFormData } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { CampaignStatus } from "@dub/prisma/client";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";
import { useCampaignFormContext } from "./campaign-form-context";

interface UseCampaignConfirmationModalsProps {
  campaign: Pick<Campaign, "id" | "type">;
}

export function useCampaignConfirmationModals({
  campaign,
}: UseCampaignConfirmationModalsProps) {
  const router = useRouter();
  const { slug: workspaceSlug } = useWorkspace();
  const { getValues } = useCampaignFormContext();

  const { makeRequest, isSubmitting: isUpdatingCampaign } =
    useApiMutation<Campaign>();

  const updateCampaign = useCallback(
    async (
      data: Partial<UpdateCampaignFormData>,
      onSuccess: (data: Campaign) => void,
    ) => {
      await makeRequest(`/api/campaigns/${campaign.id}`, {
        method: "PATCH",
        body: {
          ...data,
        },
        onSuccess: async (data) => {
          await mutatePrefix(`/api/campaigns/${campaign.id}`);
          onSuccess(data);
        },
      });
    },
    [makeRequest, campaign.id],
  );

  const {
    confirmModal: publishConfirmModal,
    setShowConfirmModal: setShowPublishModal,
  } = useConfirmModal({
    title: "Publish Campaign",
    description:
      "Are you sure you want to publish this campaign? Once your campaign rules are met, it will be sent to the partners in the selected groups.",
    onConfirm: async () => {
      await updateCampaign(
        {
          ...getValues(),
          status: CampaignStatus.active,
        },
        () => {
          toast.success("Email campaign published!");
          router.push(`/${workspaceSlug}/program/campaigns`);
        },
      );
    },
    confirmText: "Publish",
    confirmShortcut: "Enter",
  });

  const { scheduledAt } = getValues();

  const {
    confirmModal: scheduleConfirmModal,
    setShowConfirmModal: setShowScheduleModal,
  } = useConfirmModal({
    title: "Schedule Campaign",
    description: scheduledAt
      ? "Are you sure you want to schedule this email campaign? It will be automatically sent to all selected partner groups at the scheduled date and time you've set."
      : "Are you sure you want to send this email campaign now? It will start sending immediately to all selected partner groups once published.",
    onConfirm: async () => {
      await updateCampaign(
        {
          ...getValues(),
          status: CampaignStatus.scheduled,
        },
        () => {
          toast.success("Email campaign scheduled!");
          router.push(`/${workspaceSlug}/program/campaigns`);
        },
      );
    },
    confirmText: "Schedule",
    confirmShortcut: "Enter",
  });

  const {
    confirmModal: pauseConfirmModal,
    setShowConfirmModal: setShowPauseModal,
  } = useConfirmModal({
    title: "Pause Campaign",
    description:
      "Are you sure you want to pause this email campaign? It will stop sending emails to new recipients.",
    onConfirm: async () => {
      await updateCampaign(
        {
          status: CampaignStatus.paused,
        },
        () => {
          toast.success("Email campaign paused!");
        },
      );
    },
    confirmText: "Pause",
    confirmShortcut: "Enter",
  });

  const {
    confirmModal: resumeConfirmModal,
    setShowConfirmModal: setShowResumeModal,
  } = useConfirmModal({
    title: "Resume Campaign",
    description:
      "Are you sure you want to resume this email campaign? It will continue sending emails to remaining recipients.",
    onConfirm: async () => {
      await updateCampaign(
        {
          status: CampaignStatus.active,
        },
        () => {
          toast.success("Email campaign resumed!");
        },
      );
    },
    confirmText: "Resume",
    confirmShortcut: "Enter",
  });

  const {
    confirmModal: cancelConfirmModal,
    setShowConfirmModal: setShowCancelModal,
  } = useConfirmModal({
    title: "Cancel Campaign",
    description: (
      <div className="flex flex-col gap-2">
        <span>
          Are you sure you want to cancel this email campaign? If you choose to
          stop delivery, we'll begin cancelling the campaign immediately.
        </span>

        <span>
          However, because sending happens in batches, some additional emails
          may still go out before the process completes.
        </span>

        <span className="font-semibold">This action cannot be undone.</span>
      </div>
    ),
    onConfirm: async () => {
      await updateCampaign(
        {
          status: CampaignStatus.cancelled,
        },
        () => {
          toast.success("Email campaign cancelled!");
        },
      );
    },
    confirmText: "Cancel Campaign",
    confirmShortcut: "Enter",
  });

  return {
    updateCampaign,
    isUpdatingCampaign,
    publishConfirmModal,
    setShowPublishModal,
    scheduleConfirmModal,
    setShowScheduleModal,
    pauseConfirmModal,
    setShowPauseModal,
    resumeConfirmModal,
    setShowResumeModal,
    cancelConfirmModal,
    setShowCancelModal,
  };
}
