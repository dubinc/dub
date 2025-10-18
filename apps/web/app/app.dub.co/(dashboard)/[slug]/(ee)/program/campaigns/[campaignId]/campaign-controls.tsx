import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { Campaign, UpdateCampaignFormData } from "@/lib/types";
import { useConfirmModal } from "@/ui/modals/confirm-modal";
import { ThreeDots } from "@/ui/shared/icons";
import { CampaignStatus } from "@dub/prisma/client";
import {
  Button,
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
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useDeleteCampaignModal } from "../delete-campaign-modal";
import { useCampaignFormContext } from "./campaign-form-context";
import { useSendEmailPreviewModal } from "./send-email-preview-modal";

interface CampaignControlsProps {
  campaign: Pick<Campaign, "id" | "name" | "type" | "status">;
}

export function CampaignControls({ campaign }: CampaignControlsProps) {
  const { isMobile } = useMediaQuery();
  const router = useRouter();
  const { slug: workspaceSlug } = useWorkspace();
  const [openPopover, setOpenPopover] = useState(false);
  const { control, getValues } = useCampaignFormContext();

  const { makeRequest, isSubmitting: isUpdatingCampaign } =
    useApiMutation<Campaign>();

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

  // Confirmation modals
  const {
    confirmModal: publishConfirmModal,
    setShowConfirmModal: setShowPublishModal,
  } = useConfirmModal({
    title: "Publish Campaign",
    description:
      "Are you sure you want to publish this email campaign? It will be sent to all selected partner groups.",
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

  const [name, subject, groupIds, bodyJson, triggerCondition] = useWatch({
    control,
    name: ["name", "subject", "groupIds", "bodyJson", "triggerCondition"],
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

      if (!sendPreview && !triggerCondition) {
        return "Please select a trigger condition.";
      }

      if (!bodyJson?.content || !bodyJson.content.length) {
        return "Please write the message you want to send to the partners.";
      }
    },
    [name, subject, groupIds, triggerCondition, bodyJson],
  );

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
    switch (campaign.status) {
      case CampaignStatus.draft:
        return {
          text: "Publish",
          icon: PaperPlane,
          onClick: () => {
            setShowPublishModal(true);
          },
          loading: isUpdatingCampaign,
        };
      case CampaignStatus.active:
        return {
          text: "Pause",
          icon: MediaPause,
          onClick: () => {
            setShowPauseModal(true);
          },
          loading: isUpdatingCampaign,
        };
      case CampaignStatus.paused:
        return {
          text: "Resume",
          icon: MediaPlay,
          onClick: () => {
            setShowResumeModal(true);
          },
          loading: isUpdatingCampaign,
        };
      default:
        return null;
    }
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
            variant="secondary"
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

      {/* Confirmation Modals */}
      {publishConfirmModal}
      {pauseConfirmModal}
      {resumeConfirmModal}
    </>
  );
}
