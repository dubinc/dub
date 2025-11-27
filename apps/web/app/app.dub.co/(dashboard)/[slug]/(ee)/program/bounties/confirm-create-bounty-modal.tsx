import { getBountyRewardDescription } from "@/lib/partners/get-bounty-reward-description";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import useGroups from "@/lib/swr/use-groups";
import { usePartnersCountByGroupIds } from "@/lib/swr/use-partners-count-by-groupids";
import useWorkspace from "@/lib/swr/use-workspace";
import { BountyProps } from "@/lib/types";
import { BountyThumbnailImage } from "@/ui/partners/bounties/bounty-thumbnail-image";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import {
  Button,
  Calendar6,
  Checkbox,
  DynamicTooltipWrapper,
  Gift,
  Modal,
  ScrollableTooltipContent,
  Tooltip,
  TooltipContent,
} from "@dub/ui";
import { Users6 } from "@dub/ui/icons";
import { formatDate, nFormatter, pluralize } from "@dub/utils";
import { cn } from "@dub/utils/src";
import {
  Dispatch,
  SetStateAction,
  useMemo,
  useState,
} from "react";

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
  const { plan, slug: workspaceSlug, isOwner } = useWorkspace();
  const { canSendEmailCampaigns } = getPlanCapabilities(plan);

  const [isLoading, setIsLoading] = useState(false);
  const [sendNotificationEmails, setSendNotificationEmails] = useState(
    canSendEmailCampaigns,
  );

  const { totalPartners, loading } = usePartnersCountByGroupIds({
    groupIds: bounty?.groups?.map((group) => group.id) ?? [],
  });

  const { groups } = useGroups();

  const eligibleGroups = useMemo(() => {
    if (!groups || !bounty || bounty.groups.length === 0) {
      return [];
    }
    return bounty.groups
      .map((bountyGroup) => groups.find((g) => g.id === bountyGroup.id))
      .filter((g): g is NonNullable<typeof g> => g !== undefined);
  }, [groups, bounty?.groups]);

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

        <div className="border-border-subtle mt-4 rounded-xl border bg-white p-2">
          <div className="flex flex-col gap-3.5">
            <div className="relative flex h-[124px] items-center justify-center rounded-lg bg-neutral-100 py-5">
              <div className="relative size-full">
                <BountyThumbnailImage bounty={bounty} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 px-2 pb-1.5">
              <h3 className="text-content-emphasis truncate text-sm font-semibold">
                {bounty.name}
              </h3>

              <div className="text-content-subtle font-regular flex items-center gap-2 text-sm">
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

              {!isOwner && (
                <div className="text-content-subtle font-regular flex items-center gap-2 text-sm">
                  <Gift className="size-3.5 shrink-0" />
                  <span className="truncate">
                    {getBountyRewardDescription(bounty)}
                  </span>
                </div>
              )}

              {isOwner && (
                <div className="text-content-subtle font-regular flex items-center gap-2 text-sm">
                  <Users6 className="size-3.5" />
                  {bounty.groups.length === 0 ? (
                    <span>All groups</span>
                  ) : eligibleGroups.length === 1 ? (
                    <div className="flex items-center gap-1.5">
                      <GroupColorCircle group={eligibleGroups[0]} />
                      <span className="truncate">{eligibleGroups[0].name}</span>
                    </div>
                  ) : eligibleGroups.length > 1 ? (
                    <Tooltip
                      content={
                        <ScrollableTooltipContent>
                          {eligibleGroups.map((group) => (
                            <div key={group.id} className="flex items-center gap-2">
                              <GroupColorCircle group={group} />
                              <span className="font-regular text-sm text-neutral-700">
                                {group.name}
                              </span>
                            </div>
                          ))}
                        </ScrollableTooltipContent>
                      }
                    >
                      <div className="flex items-center gap-1.5">
                        <GroupColorCircle group={eligibleGroups[0]} />
                        <span className="truncate">
                          {eligibleGroups[0].name} +{eligibleGroups.length - 1}
                        </span>
                      </div>
                    </Tooltip>
                  ) : null}
                </div>
              )}
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
                      href={`/${workspaceSlug}/upgrade?showPartnersUpgradeModal=true`}
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
                  nFormatter(totalPartners, { full: true })
                )}{" "}
                selected {pluralize("partner", totalPartners)}
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
