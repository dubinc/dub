import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { Campaign } from "@/lib/types";
import { ThreeDots } from "@/ui/shared/icons";
import { CampaignStatus } from "@dub/prisma/client";
import { Button, MenuItem, PaperPlane, Popover, Trash } from "@dub/ui";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDeleteCampaignModal } from "../delete-campaign-modal";
import { useCampaignFormContext } from "./campaign-form-context";
import { useSendEmailPreviewModal } from "./send-email-preview-modal";

interface CampaignEditorControlsProps {
  campaign: Pick<Campaign, "id" | "name" | "type">;
}

export function CampaignEditorControls({
  campaign,
}: CampaignEditorControlsProps) {
  const router = useRouter();
  const { slug: workspaceSlug } = useWorkspace();
  const [openPopover, setOpenPopover] = useState(false);
  const { watch, getValues } = useCampaignFormContext();

  const { makeRequest: publishCampaign, isSubmitting: isCreatingCampaign } =
    useApiMutation<Campaign>();

  const { SendEmailPreviewModal, setShowSendEmailPreviewModal } =
    useSendEmailPreviewModal({
      campaignId: campaign.id,
    });

  const { DeleteCampaignModal, setShowDeleteCampaignModal } =
    useDeleteCampaignModal(campaign);

  const [name, subject, groupIds, body, status, triggerCondition] = watch([
    "name",
    "subject",
    "groupIds",
    "body",
    "status",
    "triggerCondition",
  ]);

  // Form validation
  const validationError = useMemo(() => {
    if (!name) {
      return "Please enter a campaign name.";
    }

    if (!subject) {
      return "Please enter a subject.";
    }

    if (groupIds === undefined) {
      return "Please select the groups you want to send this campaign to.";
    }

    if (!body?.replace("<p></p>", "")) {
      return "Please write the message you want to send to the partners.";
    }
  }, [name, subject, groupIds, body, status, triggerCondition]);

  // Publish the campaign
  const handlePublishCampaign = useCallback(async () => {
    const allFormData = getValues();

    await publishCampaign(`/api/campaigns/${campaign.id}`, {
      method: "PATCH",
      body: {
        ...allFormData,
        status: CampaignStatus.active,
        triggerCondition: {
          attribute: "totalLeads",
          operator: "gte",
          value: 1,
        },
      },
      onSuccess: () => {
        toast.success("Campaign published successfully!");
        router.push(`/${workspaceSlug}/program/campaigns`);
      },
    });
  }, [getValues, publishCampaign, campaign.id, router, workspaceSlug]);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          disabled={!!validationError}
          disabledTooltip={validationError}
          onClick={handlePublishCampaign}
          loading={isCreatingCampaign}
          text="Create"
          className="h-9"
        />
        <Popover
          openPopover={openPopover}
          setOpenPopover={setOpenPopover}
          align="end"
          content={
            <Command tabIndex={0} loop className="focus:outline-none">
              <Command.List className="flex w-screen flex-col gap-1 p-1.5 text-sm focus-visible:outline-none sm:w-auto sm:min-w-[150px]">
                <MenuItem
                  as={Command.Item}
                  icon={PaperPlane}
                  disabled={!!validationError || isCreatingCampaign}
                  disabledTooltip={validationError}
                  onSelect={() => {
                    setOpenPopover(false);
                    setShowSendEmailPreviewModal(true);
                  }}
                >
                  Send preview
                </MenuItem>

                <MenuItem
                  as={Command.Item}
                  icon={Trash}
                  disabled={isCreatingCampaign}
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
            className="h-8 w-auto px-1.5"
            icon={<ThreeDots className="size-5 text-neutral-500" />}
          />
        </Popover>
      </div>

      <SendEmailPreviewModal />
      <DeleteCampaignModal />
    </>
  );
}
