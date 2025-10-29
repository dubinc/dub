import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { Campaign } from "@/lib/types";
import { ThreeDots } from "@/ui/shared/icons";
import { CampaignStatus } from "@dub/prisma/client";
import {
  Button,
  CircleXmark,
  Duplicate,
  Flask,
  LoadingCircle,
  MediaPause,
  MediaPlay,
  MenuItem,
  PaperPlane,
  Popover,
  Trash,
  useMediaQuery,
} from "@dub/ui";
import { Command } from "cmdk";
import { isFuture } from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useWatch } from "react-hook-form";
import { useDeleteCampaignModal } from "../delete-campaign-modal";
import { useCampaignFormContext } from "./campaign-form-context";
import { useSendEmailPreviewModal } from "./send-email-preview-modal";
import { useCampaignConfirmationModals } from "./use-campaign-confirmation-modals";

interface CampaignControlsProps {
  campaign: Pick<Campaign, "id" | "name" | "type" | "status">;
}

export function CampaignControls({ campaign }: CampaignControlsProps) {
  const router = useRouter();
  const { isMobile } = useMediaQuery();
  const { slug: workspaceSlug } = useWorkspace();
  const [openPopover, setOpenPopover] = useState(false);
  const { control } = useCampaignFormContext();

  const {
    makeRequest: duplicateCampaign,
    isSubmitting: isDuplicatingCampaign,
  } = useApiMutation<{ id: string }>();

  const { SendEmailPreviewModal, setShowSendEmailPreviewModal } =
    useSendEmailPreviewModal({
      campaignId: campaign.id,
    });

  const { DeleteCampaignModal, setShowDeleteCampaignModal } =
    useDeleteCampaignModal(campaign);

  const [
    name,
    subject,
    groupIds,
    bodyJson,
    triggerCondition,
    from,
    scheduledAt,
  ] = useWatch({
    control,
    name: [
      "name",
      "subject",
      "groupIds",
      "bodyJson",
      "triggerCondition",
      "from",
      "scheduledAt",
    ],
  });

  // Form validation
  const validationError = useCallback(
    ({ sendPreview = false }: { sendPreview?: boolean } = {}) => {
      if (!name) {
        return "Please enter a campaign name.";
      }

      if (!subject) {
        return "Please enter a subject.";
      }

      if (groupIds === undefined) {
        return "Please select the groups you want to send this campaign to.";
      }

      if (!from && !sendPreview) {
        return "Please select a sender email address.";
      }

      if (
        !sendPreview &&
        campaign.type === "transactional" &&
        !triggerCondition
      ) {
        return "Please select a trigger condition.";
      }

      if (!bodyJson?.content || !bodyJson.content.length) {
        return "Please write the message you want to send to the partners.";
      }
    },
    [name, subject, groupIds, triggerCondition, bodyJson, from],
  );

  // Confirmation modals
  const {
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
  } = useCampaignConfirmationModals({
    campaign,
  });

  const handleCampaignDuplication = async () => {
    await duplicateCampaign(`/api/campaigns/${campaign.id}/duplicate`, {
      method: "POST",
      onSuccess: (campaign) => {
        router.push(`/${workspaceSlug}/program/campaigns/${campaign.id}`);
        mutatePrefix("/api/campaigns");
      },
    });
  };

  const actionButton = (() => {
    const marketingActionButtonMap = {
      [CampaignStatus.draft]: {
        text:
          scheduledAt && isFuture(new Date(scheduledAt)) ? "Schedule" : "Send",
        icon: PaperPlane,
        loading: isUpdatingCampaign,
        variant: "primary",
        onClick: () => {
          setShowScheduleModal(true);
        },
      },

      [CampaignStatus.scheduled]: {
        text: "Cancel",
        icon: CircleXmark,
        loading: isUpdatingCampaign,
        onClick: () => {
          setShowCancelModal(true);
        },
      },

      [CampaignStatus.sending]: {
        text: "Cancel",
        icon: CircleXmark,
        loading: isUpdatingCampaign,
        onClick: () => {
          setShowCancelModal(true);
        },
      },

      [CampaignStatus.sent]: null, // No action once sent
      [CampaignStatus.canceled]: null, // No action once canceled
    };

    const transactionalActionButtonMap = {
      [CampaignStatus.draft]: {
        text: "Publish",
        icon: PaperPlane,
        loading: isUpdatingCampaign,
        onClick: () => {
          setShowPublishModal(true);
        },
      },

      [CampaignStatus.active]: {
        text: "Pause",
        icon: MediaPause,
        loading: isUpdatingCampaign,
        onClick: () => {
          setShowPauseModal(true);
        },
      },

      [CampaignStatus.paused]: {
        text: "Resume",
        icon: MediaPlay,
        loading: isUpdatingCampaign,
        onClick: () => {
          setShowResumeModal(true);
        },
      },
    };

    if (campaign.type === "transactional") {
      return transactionalActionButtonMap[campaign.status];
    }

    if (campaign.type === "marketing") {
      return marketingActionButtonMap[campaign.status];
    }

    return null;
  })();

  return (
    <>
      <div className="flex items-center gap-2">
        {actionButton && (
          <Button
            text={actionButton.text}
            icon={<actionButton.icon className="size-4" />}
            disabled={!!validationError()}
            disabledTooltip={validationError()}
            onClick={actionButton.onClick}
            loading={actionButton.loading}
            className="hidden h-9 px-4 sm:flex"
            variant={actionButton.variant || "secondary"}
          />
        )}

        <Popover
          openPopover={openPopover}
          setOpenPopover={setOpenPopover}
          align="end"
          content={
            <Command tabIndex={0} loop className="focus:outline-none">
              <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[150px]">
                {actionButton && isMobile && (
                  <MenuItem
                    as={Command.Item}
                    icon={actionButton.icon}
                    disabled={!!validationError() || actionButton.loading}
                    disabledTooltip={validationError()}
                    onSelect={() => {
                      setOpenPopover(false);
                      actionButton.onClick();
                    }}
                  >
                    {actionButton.text}
                  </MenuItem>
                )}

                <MenuItem
                  as={Command.Item}
                  icon={Flask}
                  disabled={
                    !!validationError({ sendPreview: true }) ||
                    isUpdatingCampaign
                  }
                  disabledTooltip={validationError({ sendPreview: true })}
                  onSelect={() => {
                    setOpenPopover(false);
                    setShowSendEmailPreviewModal(true);
                  }}
                >
                  Send preview
                </MenuItem>

                <MenuItem
                  as={Command.Item}
                  icon={isDuplicatingCampaign ? LoadingCircle : Duplicate}
                  disabled={isUpdatingCampaign || isDuplicatingCampaign}
                  onSelect={() => {
                    handleCampaignDuplication();
                  }}
                >
                  Duplicate
                </MenuItem>

                <MenuItem
                  as={Command.Item}
                  icon={Trash}
                  disabled={isUpdatingCampaign}
                  variant="danger"
                  onSelect={() => {
                    setOpenPopover(false);
                    setShowDeleteCampaignModal(true);
                  }}
                >
                  Delete
                </MenuItem>
              </Command.List>
            </Command>
          }
        >
          <Button
            onClick={() => setOpenPopover(!openPopover)}
            variant="secondary"
            className="h-9 w-auto px-1.5"
            icon={<ThreeDots className="size-5 text-neutral-500" />}
          />
        </Popover>
      </div>

      <SendEmailPreviewModal />
      <DeleteCampaignModal />

      {publishConfirmModal}
      {scheduleConfirmModal}
      {pauseConfirmModal}
      {resumeConfirmModal}
      {cancelConfirmModal}
    </>
  );
}
