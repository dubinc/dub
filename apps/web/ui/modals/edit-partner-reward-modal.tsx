"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { deleteRewardAction } from "@/lib/actions/partners/delete-reward";
import { updatePartnerEnrollmentAction } from "@/lib/actions/partners/update-partner-enrollment";
import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useGroup from "@/lib/swr/use-group";
import usePartnersCount from "@/lib/swr/use-partners-count";
import { useRewards } from "@/lib/swr/use-rewards";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps, GroupProps, RewardProps } from "@/lib/types";
import { REWARD_EVENT_COLUMN_MAPPING } from "@/lib/zod/schemas/rewards";
import { useConfirmRewardChangeModal } from "@/ui/modals/confirm-reward-change-modal";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { RewardSheet } from "@/ui/partners/rewards/add-edit-reward-sheet";
import { AdditionalRewardOptionList } from "@/ui/partners/rewards/additional-reward-option-list";
import { REWARD_EVENT_ICON } from "@/ui/partners/rewards/reward-event-icon";
import { Button, Modal } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { mutate } from "swr";

type PartnerLink = NonNullable<EnrolledPartnerProps["links"]>[number];
type OverrideRewardEvent = "sale" | "lead" | "click";
type PartnerRewardOverridePartner = Pick<
  EnrolledPartnerProps,
  | "id"
  | "name"
  | "email"
  | "image"
  | "groupId"
  | "clickRewardId"
  | "leadRewardId"
  | "saleRewardId"
>;

export type PartnerRewardOverrideTarget =
  | {
      type: "partner";
      partner: PartnerRewardOverridePartner;
    }
  | {
      type: "link";
      link: PartnerLink;
      partner: PartnerRewardOverridePartner;
    };

function getReferenceId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) {
    return null;
  }

  return typeof value === "string" ? value : value.id;
}

function getGroupRewardId(
  group: GroupProps | null | undefined,
  event: OverrideRewardEvent,
) {
  return {
    sale: group?.saleReward?.id,
    lead: group?.leadReward?.id,
    click: group?.clickReward?.id,
  }[event];
}

function getPartnerRewardId(
  partner: PartnerRewardOverrideTarget["partner"],
  event: OverrideRewardEvent,
) {
  return {
    sale: partner.saleRewardId,
    lead: partner.leadRewardId,
    click: partner.clickRewardId,
  }[event];
}

function getLinkRewardId(link: PartnerLink, event: OverrideRewardEvent) {
  return getReferenceId(
    {
      sale: link.saleReward,
      lead: link.leadReward,
      click: link.clickReward,
    }[event],
  );
}

function getSelectedRewardId({
  target,
  event,
  groupRewardId,
}: {
  target: PartnerRewardOverrideTarget;
  event: OverrideRewardEvent;
  groupRewardId: string | null | undefined;
}) {
  if (target.type === "partner") {
    return getPartnerRewardId(target.partner, event) ?? groupRewardId ?? null;
  }

  return (
    getLinkRewardId(target.link, event) ??
    getPartnerRewardId(target.partner, event) ??
    groupRewardId ??
    null
  );
}

interface EditPartnerRewardModalProps {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  event: OverrideRewardEvent;
  target: PartnerRewardOverrideTarget;
  group?: GroupProps | null;
}

function EditPartnerRewardModal({
  showModal,
  setShowModal,
  event,
  target,
  group: groupProp,
}: EditPartnerRewardModalProps) {
  const { partner } = target;

  const { id: workspaceId } = useWorkspace();

  const { rewards, loading: rewardsLoading } = useRewards({
    groupId: partner.groupId,
    swrOpts: {
      revalidateOnFocus: true,
    },
  });

  const { makeRequest: updatePartnerLink, isSubmitting: isUpdatingLink } =
    useApiMutation();

  const { ConfirmRewardChangeModal, openConfirmRewardChangeModal } =
    useConfirmRewardChangeModal();

  const { group: fetchedGroup } = useGroup({
    groupIdOrSlug: partner.groupId,
  });
  const group = groupProp ?? fetchedGroup;
  const groupRewardId = getGroupRewardId(group, event);

  const { partnersCount } = usePartnersCount<number | undefined>({
    groupId: group?.id,
    ignoreParams: true,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rewardSheet, setRewardSheet] = useState<{
    reward: RewardProps | null;
  } | null>(null);
  const [isRewardSheetOpen, setIsRewardSheetOpen] = useState(false);

  const eventRewards = useMemo(() => {
    return (rewards ?? [])
      .filter((reward) => reward.event === event)
      .sort((a, b) => {
        if (a.id === groupRewardId) return -1;
        if (b.id === groupRewardId) return 1;
        return 0;
      });
  }, [rewards, event, groupRewardId]);

  const resolvedSelectedId =
    selectedId ??
    getSelectedRewardId({
      target,
      event,
      groupRewardId,
    });

  useEffect(() => {
    if (showModal) {
      return;
    }

    setIsRewardSheetOpen(false);
    setRewardSheet(null);
    setSelectedId(null);
  }, [showModal]);

  const { executeAsync: updateEnrollment, isPending: isUpdatingEnrollment } =
    useAction(updatePartnerEnrollmentAction, {
      onSuccess: async () => {
        setShowModal(false);
        toast.success("Reward updated");
        await mutatePrefix("/api/partners");
      },
      onError({ error }) {
        toast.error(parseActionError(error, "Failed to update reward"));
      },
    });

  const { executeAsync: deleteReward, isPending: isDeleting } = useAction(
    deleteRewardAction,
    {
      onSuccess: async () => {
        toast.success("Reward deleted!");
        await mutate(
          (key) => typeof key === "string" && key.startsWith("/api/rewards"),
        );
        await mutatePrefix("/api/partners");
      },
      onError({ error }) {
        toast.error(error.serverError ?? "Failed to delete reward");
      },
    },
  );

  const isSubmitting = isUpdatingLink || isUpdatingEnrollment;

  const CreateIcon = REWARD_EVENT_ICON[event];
  const openRewardSheet = (reward: RewardProps | null = null) => {
    setRewardSheet({ reward });
    setIsRewardSheetOpen(true);
  };

  const options = useMemo(
    () =>
      eventRewards.map((reward) => {
        const isGroup = reward.id === groupRewardId;
        const description = formatRewardDescription(reward);

        return {
          id: reward.id,
          isGroup,
          partnersCount: reward.partnersCount,
          searchValue: isGroup ? `${description} group` : description,
          label: (
            <ProgramRewardDescription
              reward={reward}
              amountClassName="font-normal"
            />
          ),
        };
      }),
    [eventRewards, groupRewardId],
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resolvedSelectedId) {
      return;
    }

    const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[event];
    const isGroupSelection = resolvedSelectedId === groupRewardId;

    if (target.type === "partner") {
      if (!workspaceId) {
        return;
      }

      await updateEnrollment({
        workspaceId,
        partnerId: partner.id,
        [rewardIdColumn]: isGroupSelection
          ? groupRewardId ?? null
          : resolvedSelectedId,
      });
      return;
    }

    await updatePartnerLink(`/api/partners/links/${target.link.id}`, {
      method: "PATCH",
      body: {
        [rewardIdColumn]: isGroupSelection ? null : resolvedSelectedId,
      },
      onSuccess: async () => {
        setShowModal(false);
        toast.success("Reward updated");
        await mutatePrefix("/api/partners/links");
      },
    });
  };

  const handleDelete = (rewardId: string) => {
    const reward = eventRewards.find((item) => item.id === rewardId);
    if (!reward || !workspaceId) {
      return;
    }

    openConfirmRewardChangeModal({
      action: "deleted",
      event: reward.event,
      reward,
      partnerCount: partnersCount,
      isPending: isDeleting,
      onConfirm: async (activityDescription) => {
        await deleteReward({
          workspaceId,
          rewardId,
          activityDescription,
        });

        if (resolvedSelectedId === rewardId) {
          setSelectedId(groupRewardId ?? null);
        }
      },
    });
  };

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="max-w-[540px]"
      preventDefaultClose={isRewardSheetOpen}
    >
      {ConfirmRewardChangeModal}
      {rewardSheet && (
        <RewardSheet
          key={rewardSheet.reward?.id ?? "new"}
          nested
          isOpen={isRewardSheetOpen}
          setIsOpen={setIsRewardSheetOpen}
          event={rewardSheet.reward?.event ?? event}
          reward={rewardSheet.reward ?? undefined}
          isDefault={false}
          groupIdOrSlug={partner.groupId}
          onCreated={setSelectedId}
        />
      )}
      <form onSubmit={onSubmit}>
          <div className="flex w-full items-center justify-between gap-3 border-b border-neutral-200 px-6 py-4">
            <h3 className="text-lg font-semibold tracking-tight">
              Edit {event} reward
            </h3>
            <Button
              type="button"
              variant="secondary"
              text="Create reward"
              icon={<CreateIcon className="size-4" />}
              className="h-8 w-fit px-3"
              onClick={() => openRewardSheet()}
            />
          </div>

          <div className="min-h-[120px] px-4 py-4">
            {rewardsLoading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-10 animate-pulse rounded-lg bg-neutral-100"
                  />
                ))}
              </div>
            ) : (
              <AdditionalRewardOptionList
                options={options}
                selectedId={resolvedSelectedId}
                onSelect={setSelectedId}
                onEdit={(id) => {
                  const reward = eventRewards.find((item) => item.id === id);
                  if (reward) {
                    openRewardSheet(reward);
                  }
                }}
                onDelete={handleDelete}
                searchPlaceholder="Search rewards..."
                emptyLabel={
                  options.length === 0
                    ? `No ${event} rewards available. Create one to get started.`
                    : "No rewards found"
                }
                onCreate={() => openRewardSheet()}
                createLabel="Create reward"
                showModal={showModal}
              />
            )}
          </div>

          <div className="border-border-subtle flex items-center justify-between gap-4 border-t px-4 py-4">
            <div className="flex min-w-0 items-center gap-2">
              <PartnerAvatar partner={partner} className="size-6 shrink-0" />
              <h4 className="min-w-0 truncate text-sm font-medium text-neutral-900">
                {partner.name}
              </h4>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                text="Cancel"
                className="h-8 w-fit px-3"
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
              />
              <Button
                type="submit"
                text="Save"
                className="h-8 w-fit px-3"
                loading={isSubmitting}
                disabled={!resolvedSelectedId || options.length === 0}
              />
            </div>
          </div>
        </form>
    </Modal>
  );
}

export function useEditPartnerRewardModal({
  event,
  target,
  group,
}: {
  event: OverrideRewardEvent;
  target: PartnerRewardOverrideTarget | null;
  group?: GroupProps | null;
}) {
  const [showModal, setShowModal] = useState(false);
  const propsRef = useRef({ event, target, group });
  const lastTargetRef = useRef(target);
  propsRef.current = { event, target, group };
  if (target) {
    lastTargetRef.current = target;
  }

  const EditPartnerRewardModalCallback = useCallback(() => {
    const { event: currentEvent, group: currentGroup } = propsRef.current;
    const currentTarget = propsRef.current.target ?? lastTargetRef.current;

    if (!currentTarget) {
      return null;
    }

    return (
      <EditPartnerRewardModal
        showModal={showModal}
        setShowModal={setShowModal}
        event={currentEvent}
        target={currentTarget}
        group={currentGroup}
      />
    );
  }, [showModal]);

  return useMemo(
    () => ({
      setShowEditPartnerRewardModal: setShowModal,
      EditPartnerRewardModal: EditPartnerRewardModalCallback,
    }),
    [EditPartnerRewardModalCallback],
  );
}
