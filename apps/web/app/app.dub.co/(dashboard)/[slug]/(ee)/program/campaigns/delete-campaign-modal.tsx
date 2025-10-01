import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import { Campaign } from "@/lib/types";
import { Button, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { CAMPAIGN_TYPE_BADGES } from "./campaign-type-badges";

interface DeleteCampaignModalProps {
  campaign: Pick<Campaign, "id" | "name" | "type">;
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
}

const DeleteCampaignModal = ({
  campaign,
  showModal,
  setShowModal,
}: DeleteCampaignModalProps) => {
  const { makeRequest: deleteCampaign, isSubmitting } = useApiMutation();

  const handleCampaignDeletion = async () => {
    await deleteCampaign(`/api/campaigns/${campaign.id}`, {
      method: "DELETE",
      onSuccess: async () => {
        setShowModal(false);
        await mutatePrefix("/api/campaigns");
        toast.success("Campaign deleted successfully!");
      },
    });
  };

  const { icon: Icon, iconClassName } = CAMPAIGN_TYPE_BADGES[campaign.type];

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="space-y-6 p-6">
        <div>
          <h3 className="text-content-emphasis text-lg font-semibold">
            Confirm delete
          </h3>
          <p className="text-content-subtle mt-1 text-sm">
            Are you sure you want to delete this campaign?
          </p>
        </div>

        <div className="flex items-center gap-4 rounded-lg border border-neutral-200 bg-white p-4">
          <div
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md",
              iconClassName,
            )}
          >
            <Icon className="size-3.5" />
          </div>
          <span className="text-content-emphasis truncate text-sm font-medium">
            {campaign.name}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            className="h-9 w-fit px-3"
            text="Cancel"
            onClick={() => setShowModal(false)}
            disabled={isSubmitting}
          />
          <Button
            variant="danger"
            className="h-9 w-fit px-3"
            text="Delete"
            loading={isSubmitting}
            onClick={handleCampaignDeletion}
          />
        </div>
      </div>
    </Modal>
  );
};

export function useDeleteCampaignModal(
  campaign: Pick<Campaign, "id" | "name" | "type">,
) {
  const [showDeleteCampaignModal, setShowDeleteCampaignModal] = useState(false);

  const DeleteCampaignModalCallback = useCallback(() => {
    return (
      <DeleteCampaignModal
        showModal={showDeleteCampaignModal}
        setShowModal={setShowDeleteCampaignModal}
        campaign={campaign}
      />
    );
  }, [showDeleteCampaignModal, setShowDeleteCampaignModal, campaign]);

  return useMemo(
    () => ({
      setShowDeleteCampaignModal,
      DeleteCampaignModal: DeleteCampaignModalCallback,
    }),
    [setShowDeleteCampaignModal, DeleteCampaignModalCallback],
  );
}
