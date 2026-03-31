import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { Campaign } from "@/lib/types";
import { Button, Modal } from "@dub/ui";
import { cn } from "@dub/utils";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
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
  const router = useRouter();
  const { slug } = useWorkspace();
  const { makeRequest: deleteCampaign, isSubmitting } = useApiMutation();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<{ confirm: string }>({
    defaultValues: {
      confirm: "",
    },
  });

  const confirm = watch("confirm");

  const handleCampaignDeletion = async () => {
    await deleteCampaign(`/api/campaigns/${campaign.id}`, {
      method: "DELETE",
      onSuccess: async () => {
        setShowModal(false);
        await mutatePrefix("/api/campaigns");
        toast.success("Campaign deleted successfully!");
        router.push(`/${slug}/program/campaigns`);
      },
    });
  };

  const { icon: Icon, iconClassName } = CAMPAIGN_TYPE_BADGES[campaign.type];

  const isDisabled = useMemo(() => {
    return confirm !== "confirm delete campaign";
  }, [confirm]);

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Delete campaign</h3>
      </div>

      <form onSubmit={handleSubmit(handleCampaignDeletion)}>
        <div className="flex flex-col gap-6 bg-neutral-50 p-4 sm:p-6">
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

          <p className="text-sm text-neutral-600">
            This will permanently delete this campaign and all associated data.
            This action is not reversible.
          </p>

          <div>
            <label className="block text-sm font-medium text-neutral-900">
              To verify, type <strong>confirm delete campaign</strong> below
            </label>
            <div className="relative mt-1.5 rounded-md shadow-sm">
              <input
                className={cn(
                  "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.confirm && "border-red-600",
                )}
                placeholder="confirm delete campaign"
                type="text"
                autoComplete="off"
                {...register("confirm", {
                  required: true,
                })}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 bg-neutral-50 px-4 pb-5 sm:px-6">
          <Button
            variant="secondary"
            className="h-8 w-fit px-3"
            text="Cancel"
            onClick={() => setShowModal(false)}
            disabled={isSubmitting}
          />
          <Button
            type="submit"
            variant="danger"
            className="h-8 w-fit px-3"
            text="Delete campaign"
            disabled={isDisabled}
            loading={isSubmitting}
          />
        </div>
      </form>
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
