import { getBountyRewardDescription } from "@/lib/partners/get-bounty-reward-description";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { usePartnersCountBounty } from "@/lib/swr/use-partners-count-bounty";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountyProps } from "@/lib/types";
import { BountyThumbnailImage } from "@/ui/partners/bounties/bounty-thumbnail-image";
import {
  Button,
  Calendar6,
  Checkbox,
  DynamicTooltipWrapper,
  Gift,
  Modal,
  TooltipContent,
} from "@dub/ui";
import { formatDate, nFormatter, pluralize } from "@dub/utils";
import { cn } from "@dub/utils/src";
import { Dispatch, SetStateAction, useState } from "react";

type ConfirmCreateBountyModalProps = {
  bounty?: Pick<
    BountyProps,
    | "type"
    | "name"
    | "startsAt"
    | "endsAt"
    | "rewardAmount"
    | "rewardDescription"
    | "groups"
  >;
  onConfirm: (data: { sendNotificationEmails: boolean }) => Promise<void>;
};

function ConfirmCreateBountyModal({
  showConfirmCreateBountyModal,
  setShowConfirmCreateBountyModal,
  bounty,
  onConfirm,
}: {
  showConfirmCreateBountyModal: boolean;
  setShowConfirmCreateBountyModal: Dispatch<SetStateAction<boolean>>;
} & ConfirmCreateBountyModalProps) {
  const { plan, slug: workspaceSlug } = useWorkspace();
  const { canSendEmailCampaigns } = getPlanCapabilities(plan);

  const [isLoading, setIsLoading] = useState(false);
  const [sendNotificationEmails, setSendNotificationEmails] = useState(
    canSendEmailCampaigns,
  );

  const { totalPartnersForBounty, loading } = usePartnersCountBounty({
    bounty,
  });

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm({ sendNotificationEmails });
      setShowConfirmCreateBountyModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  return bounty ? (
    <Modal
      showModal={showConfirmCreateBountyModal}
      setShowModal={setShowConfirmCreateBountyModal}
    >
      <div className="px-5 py-4 text-left">
        <h3 className="text-content-emphasis text-base font-semibold">
          Confirm bounty creation
        </h3>
        <p className="text-content-subtle mt-1 text-sm">
          You are about to create this bounty for the selected partner groups.
        </p>

        <div className="border-border-default mt-4 flex items-center gap-3 rounded-xl border p-2">
          <div className="relative flex size-[70px] shrink-0 items-center justify-center rounded-lg bg-neutral-100 p-2">
            <BountyThumbnailImage bounty={bounty} />
          </div>

          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="text-content-emphasis truncate text-sm font-semibold">
              {bounty.name}
            </h3>

            <div className="text-content-subtle flex items-center gap-2 text-sm font-medium">
              <Calendar6 className="size-3.5" />
              <span>
                {formatDate(bounty.startsAt, { month: "short" })}
                {bounty.endsAt && (
                  <>
                    {" → "}
                    {formatDate(bounty.endsAt, { month: "short" })}
                  </>
                )}
              </span>
            </div>

            <div className="text-content-subtle flex items-center gap-2 text-sm font-medium">
              <Gift className="size-3.5 shrink-0" />
              <span className="truncate">
                {getBountyRewardDescription(bounty)}
              </span>
            </div>
          </div>
        </div>

        <DynamicTooltipWrapper
          tooltipProps={
            !canSendEmailCampaigns
              ? {
                  content: (
                    <TooltipContent
                      title="New bounty notifications are only available on Advanced plans and above."
                      cta="Upgrade to Advanced"
                      href={`/${workspaceSlug}/upgrade?plan=advanced`}
                      target="_blank"
                    />
                  ),
                }
              : undefined
          }
        >
          <label
            className={cn(
              "mt-4 flex items-center gap-2",
              !canSendEmailCampaigns &&
                "pointer-events-none cursor-not-allowed",
            )}
          >
            <Checkbox
              checked={canSendEmailCampaigns ? sendNotificationEmails : false}
              onCheckedChange={(checked) =>
                setSendNotificationEmails(Boolean(checked))
              }
              disabled={!canSendEmailCampaigns}
              className="data-[state=checked]:bg-black"
            />
            <span
              className={cn(
                "text-content-default select-none text-sm font-medium",
                !canSendEmailCampaigns && "opacity-50",
              )}
            >
              Send notification to{" "}
              <strong className="text-content-emphasis font-semibold">
                {loading ? (
                  <span className="inline-block h-4 w-6 animate-pulse rounded bg-neutral-200 align-text-bottom" />
                ) : (
                  nFormatter(totalPartnersForBounty, { full: true })
                )}{" "}
                selected {pluralize("partner", totalPartnersForBounty)}
              </strong>
            </span>
          </label>
        </DynamicTooltipWrapper>
      </div>

      <div className="border-border-subtle flex items-center justify-end gap-2 border-t px-5 py-4">
        <Button
          variant="secondary"
          className="h-8 w-fit px-3"
          text="Cancel"
          onClick={() => setShowConfirmCreateBountyModal(false)}
        />
        <Button
          variant="primary"
          className="h-8 w-fit px-3"
          text="Confirm"
          loading={isLoading}
          onClick={handleConfirm}
        />
      </div>
    </Modal>
  ) : null;
}

export function useConfirmCreateBountyModal(
  props: ConfirmCreateBountyModalProps,
) {
  const [showConfirmCreateBountyModal, setShowConfirmCreateBountyModal] =
    useState(false);

  return {
    setShowConfirmCreateBountyModal,
    confirmCreateBountyModal: (
      <ConfirmCreateBountyModal
        showConfirmCreateBountyModal={showConfirmCreateBountyModal}
        setShowConfirmCreateBountyModal={setShowConfirmCreateBountyModal}
        {...props}
      />
    ),
  };
}
