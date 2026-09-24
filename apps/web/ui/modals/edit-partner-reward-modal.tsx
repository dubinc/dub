"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import { deleteRewardAction } from "@/lib/actions/partners/delete-reward";
import { updatePartnerEnrollmentAction } from "@/lib/actions/partners/update-partner-enrollment";
import { constructPartnerLink } from "@/lib/partners/construct-partner-link";
import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useGroup from "@/lib/swr/use-group";
import { ProgramPartnerLinkExtended } from "@/lib/swr/use-program-partner-links";
import { useRewards } from "@/lib/swr/use-rewards";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps, GroupProps, RewardProps } from "@/lib/types";
import { REWARD_EVENT_COLUMN_MAPPING } from "@/lib/zod/schemas/rewards";
import { useConfirmRewardChangeModal } from "@/ui/modals/confirm-reward-change-modal";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { KeepPartnerInGroupNotice } from "@/ui/partners/keep-partner-in-group-notice";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { RewardSheet } from "@/ui/partners/rewards/add-edit-reward-sheet";
import { AdditionalRewardOptionList } from "@/ui/partners/rewards/additional-reward-option-list";
import { REWARD_EVENT_ICON } from "@/ui/partners/rewards/reward-event-icon";
import { ArrowTurnRight2, Button, Modal } from "@dub/ui";
import { cn, getPrettyUrl } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

type PartnerLink = ProgramPartnerLinkExtended;
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
  partner: PartnerRewardOverridePartner,
  event: OverrideRewardEvent,
) {
  return {
    sale: partner.saleRewardId,
    lead: partner.leadRewardId,
    click: partner.clickRewardId,
  }[event];
}

function getLinkRewardId(link: PartnerLink, event: OverrideRewardEvent) {
  return (
    {
      sale: link.saleReward,
      lead: link.leadReward,
      click: link.clickReward,
    }[event] ?? null
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

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rewardSheet, setRewardSheet] = useState<{
    reward: RewardProps | null;
  } | null>(null);
  const [isRewardSheetOpen, setIsRewardSheetOpen] = useState(false);

  const { id: workspaceId, slug } = useWorkspace();
  const { rewards, loading: rewardsLoading } = useRewards(
    {
      groupId: partner.groupId,
    },
    {
      revalidateOnFocus: true,
    },
  );
  const { group: fetchedGroup } = useGroup({
    groupIdOrSlug: partner.groupId ?? undefined,
  });
  const group = groupProp ?? fetchedGroup;
  const { ConfirmRewardChangeModal, confirmRewardChange } =
    useConfirmRewardChangeModal();

  const { makeRequest: updatePartnerLink, isSubmitting: isUpdatingLink } =
    useApiMutation();

  const { executeAsync: updateEnrollment, isPending: isUpdatingEnrollment } =
    useAction(updatePartnerEnrollmentAction, {
      onSuccess: async () => {
        setShowModal(false);
        toast.success("Reward updated");
        await mutatePrefix(["/api/partners", "/api/rewards"]);
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
        await mutatePrefix(["/api/rewards", "/api/partners", "/api/groups"]);
      },
      onError({ error }) {
        toast.error(error.serverError ?? "Failed to delete reward");
      },
    },
  );

  const groupRewardId = getGroupRewardId(group, event);
  const CreateIcon = REWARD_EVENT_ICON[event];

  const eventRewards = useMemo(() => {
    return (rewards ?? [])
      .filter((reward) => reward.event === event)
      .sort((a, b) => {
        if (a.id === groupRewardId) return -1;
        if (b.id === groupRewardId) return 1;
        return 0;
      });
  }, [rewards, event, groupRewardId]);

  const currentId = getSelectedRewardId({
    target,
    event,
    groupRewardId,
  });
  const resolvedSelectedId = selectedId ?? currentId;
  const hasChanges = resolvedSelectedId !== currentId;
  const isSubmitting = isUpdatingLink || isUpdatingEnrollment;

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

  useEffect(() => {
    if (showModal) {
      return;
    }

    setIsRewardSheetOpen(false);
    setRewardSheet(null);
    setSelectedId(null);
  }, [showModal]);

  const openRewardSheet = useCallback((reward: RewardProps | null = null) => {
    setRewardSheet({ reward });
    setIsRewardSheetOpen(true);
  }, []);

  const persistOverride = useCallback(
    async (activityDescription?: string) => {
      const rewardIdColumn = REWARD_EVENT_COLUMN_MAPPING[event];

      if (target.type === "partner") {
        if (!workspaceId) {
          return;
        }

        await updateEnrollment({
          workspaceId,
          partnerId: partner.id,
          [rewardIdColumn]: resolvedSelectedId,
          activityDescription,
        });
        return;
      }

      await updatePartnerLink(`/api/partners/links/${target.link.id}`, {
        method: "PATCH",
        body: {
          [rewardIdColumn]: resolvedSelectedId,
          activityDescription,
        },
        onSuccess: async () => {
          setShowModal(false);
          toast.success("Reward updated");
          await mutatePrefix(["/api/partners", "/api/partners/links"]);
        },
      });
    },
    [
      workspaceId,
      event,
      resolvedSelectedId,
      updateEnrollment,
      updatePartnerLink,
      target,
      partner.id,
      setShowModal,
    ],
  );

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!resolvedSelectedId) {
        return;
      }

      const selectedReward = eventRewards.find(
        (item) => item.id === resolvedSelectedId,
      );

      if (!selectedReward) {
        return;
      }

      if (!hasChanges) {
        setShowModal(false);
        return;
      }

      await confirmRewardChange({
        action: "updated",
        target: target.type,
        reward: selectedReward,
        isPending: isSubmitting,
        onConfirm: persistOverride,
      });
    },
    [
      resolvedSelectedId,
      hasChanges,
      eventRewards,
      setShowModal,
      confirmRewardChange,
      target.type,
      isSubmitting,
      persistOverride,
    ],
  );

  const handleDelete = useCallback(
    async (rewardId: string) => {
      const reward = eventRewards.find((item) => item.id === rewardId);
      if (!reward || !workspaceId || reward.id === groupRewardId) {
        return;
      }

      await confirmRewardChange({
        action: "deleted",
        target: "group",
        isDefault: false,
        reward,
        partnerCount: reward.partnersCount ?? undefined,
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
    },
    [
      eventRewards,
      workspaceId,
      confirmRewardChange,
      groupRewardId,
      isDeleting,
      deleteReward,
      resolvedSelectedId,
    ],
  );

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
          isDefault={rewardSheet.reward ? undefined : false}
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
              onDelete={group ? handleDelete : undefined}
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
            <div className="min-w-0 leading-tight">
              <div className="flex min-w-0 items-center gap-2">
                <Link
                  href={`/${slug}/program/partners/${partner.id}`}
                  target="_blank"
                  className={cn(
                    "min-w-0 cursor-alias truncate text-xs font-medium text-neutral-900 decoration-dotted hover:underline",
                    target.type !== "link" && "text-sm",
                  )}
                >
                  {partner.name}
                </Link>
                <KeepPartnerInGroupNotice offerType="reward" />
              </div>
              {target.type === "link" && (
                <Link
                  href={`/${slug}/links/${getPrettyUrl(target.link.shortLink)}`}
                  target="_blank"
                  className="flex cursor-alias items-center gap-1 truncate text-[11px] text-neutral-500 decoration-dotted hover:underline"
                >
                  <ArrowTurnRight2 className="size-3" />
                  {getPrettyUrl(
                    constructPartnerLink({ group, link: target.link }),
                  )}
                </Link>
              )}
            </div>
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
              disabled={
                !resolvedSelectedId || options.length === 0 || !hasChanges
              }
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
