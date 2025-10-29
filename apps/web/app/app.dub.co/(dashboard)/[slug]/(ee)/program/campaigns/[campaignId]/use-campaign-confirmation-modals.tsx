import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import { usePartnersCountByGroupIds } from "@/lib/swr/use-partners-count-by-groupids";
import useWorkspace from "@/lib/swr/use-workspace";
import { Campaign, UpdateCampaignFormData } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { CampaignStatus } from "@dub/prisma/client";
import { pluralize } from "@dub/utils";
import { isFuture } from "date-fns";
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
  const { watch, getValues } = useCampaignFormContext();

  const { makeRequest, isSubmitting: isUpdatingCampaign } =
    useApiMutation<Campaign>();

  const scheduledAt = watch("scheduledAt");
  const isScheduled = scheduledAt && isFuture(new Date(scheduledAt));

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

  const { totalPartners } = usePartnersCountByGroupIds({
    groupIds: campaign.type === "marketing" ? watch("groupIds") : undefined,
  });

  const {
    confirmModal: scheduleConfirmModal,
    setShowConfirmModal: setShowScheduleModal,
  } = useConfirmModal({
    title: isScheduled ? "Schedule Campaign" : "Send Campaign",
    description: (
      <>
        Are you sure you want to {isScheduled ? "schedule" : "send"} this email
        campaign? It will{" "}
        {isScheduled ? "be automatically sent" : "start sending immediately"} to{" "}
        <strong className="text-neutral-900">
          {totalPartners} {pluralize("partner", totalPartners)}
        </strong>
        {isScheduled
          ? " at the scheduled date and time you've set."
          : " once published."}
      </>
    ),
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
    confirmText: `${isScheduled ? "Schedule" : "Send"} to ${totalPartners} ${pluralize("partner", totalPartners)}`,
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
    description: isScheduled ? (
      <div className="space-y-2">
        <p>
          Are you sure you want to cancel this scheduled email campaign? The
          campaign will not be sent at the scheduled time.
        </p>

        <p className="font-semibold">This action cannot be undone.</p>
      </div>
    ) : (
      <div className="space-y-2">
        <p>
          Are you sure you want to cancel this email campaign? If you choose to
          stop delivery, we'll begin cancelling the campaign immediately.
        </p>

        <p>
          However, because sending happens in batches, some additional emails
          may still go out before the process completes.
        </p>

        <p className="font-semibold">This action cannot be undone.</p>
      </div>
    ),
    onConfirm: async () => {
      await updateCampaign(
        {
          status: CampaignStatus.canceled,
          scheduledAt: null,
        },
        () => {
          toast.success("Email campaign canceled!");
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
