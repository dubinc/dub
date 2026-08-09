"use client";

import { RewardProps } from "@/lib/types";
import { REWARD_CHANGE_DESCRIPTION_MAX_LENGTH } from "@/lib/zod/schemas/rewards";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { REWARD_EVENT_DESCRIPTIONS } from "@/ui/partners/rewards/reward-event-descriptions";
import { MaxCharactersCounter } from "@/ui/shared/max-characters-counter";
import { Button, Modal } from "@dub/ui";
import { cn, pluralize } from "@dub/utils";
import { EventType } from "@prisma/client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { PartnerEmailNotificationTooltipHelper } from "../shared/partner-email-notification-tooltip-helper";

export type RewardChangeAction = "created" | "updated" | "deleted";

const TITLES: Record<RewardChangeAction, string> = {
  created: "Create reward",
  updated: "Update reward",
  deleted: "Delete reward",
};

const CONFIRM_TEXT: Record<RewardChangeAction, string> = {
  created: "Create reward",
  updated: "Update reward",
  deleted: "Delete reward",
};

type ConfirmRewardChangeFormData = {
  changeDescription: string;
};

type ConfirmRewardChangeModalProps = {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  action: RewardChangeAction;
  event: EventType;
  reward: Pick<
    RewardProps,
    | "description"
    | "event"
    | "maxDuration"
    | "modifiers"
    | "tooltipDescription"
    | "type"
    | "amountInCents"
    | "amountInPercentage"
    | "config"
    | "spendLimitAmount"
    | "spendLimitInterval"
  >;
  partnerCount?: number;
  onConfirm: (changeDescription?: string) => Promise<void>;
  isPending?: boolean;
};

export function ConfirmRewardChangeModal({
  showModal,
  setShowModal,
  action,
  event,
  reward,
  partnerCount,
  onConfirm,
  isPending = false,
}: ConfirmRewardChangeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { icon: Icon, title } = REWARD_EVENT_DESCRIPTIONS[event];

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ConfirmRewardChangeFormData>({
    defaultValues: {
      changeDescription: "",
    },
  });

  useEffect(() => {
    if (showModal) {
      reset({ changeDescription: "" });
    }
  }, [showModal, reset]);

  const change = {
    created: "added to",
    updated: "updated for",
    deleted: "removed from",
  }[action];

  const onSubmit = handleSubmit(async ({ changeDescription }) => {
    setIsLoading(true);
    try {
      const trimmedDescription = changeDescription.trim();
      await onConfirm(trimmedDescription || undefined);
      setShowModal(false);
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="max-w-md"
    >
      <form onSubmit={onSubmit}>
        <div className="px-5 py-4 text-left">
          <h3 className="text-content-emphasis text-base font-semibold">
            {TITLES[action]}
          </h3>
          <p className="text-content-subtle mt-1 text-sm">
            The reward below will be {change} the group
            {partnerCount && partnerCount > 0 ? (
              <>
                , and {partnerCount} {pluralize("partner", partnerCount)} will
                be <PartnerEmailNotificationTooltipHelper />
              </>
            ) : (
              ""
            )}
            .
          </p>

          <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-100 p-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-white">
                <Icon className="size-4 text-neutral-800" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5 py-0.5">
                <p className="text-sm font-medium text-neutral-900">{title}</p>
                <div className="text-sm text-neutral-600">
                  <ProgramRewardDescription reward={reward} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor="changeDescription"
                className="text-content-emphasis text-sm font-medium"
              >
                Message to partners
                <span className="ml-1 font-normal text-neutral-500">
                  (optional)
                </span>
              </label>
              <MaxCharactersCounter
                name="changeDescription"
                maxLength={REWARD_CHANGE_DESCRIPTION_MAX_LENGTH}
                control={control}
              />
            </div>
            <textarea
              id="changeDescription"
              rows={3}
              maxLength={REWARD_CHANGE_DESCRIPTION_MAX_LENGTH}
              placeholder="Add context about this change..."
              className={cn(
                "mt-2 block w-full rounded-md border-neutral-300 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500",
                errors.changeDescription && "border-red-600",
              )}
              {...register("changeDescription", {
                maxLength: {
                  value: REWARD_CHANGE_DESCRIPTION_MAX_LENGTH,
                  message: `Must be ${REWARD_CHANGE_DESCRIPTION_MAX_LENGTH} characters or fewer`,
                },
              })}
            />
            {errors.changeDescription && (
              <p className="mt-1 text-xs text-red-600">
                {errors.changeDescription.message}
              </p>
            )}
            {partnerCount && partnerCount > 0 ? (
              <p className="mt-1.5 text-xs text-neutral-500">
                Included in the partner notification email and activity log
              </p>
            ) : (
              <p className="mt-1.5 text-xs text-neutral-500">
                Saved to the activity log
              </p>
            )}
          </div>
        </div>

        <div className="border-border-subtle flex items-center justify-end gap-2 border-t px-5 py-4">
          <Button
            type="button"
            variant="secondary"
            className="h-8 w-fit px-3"
            text="Cancel"
            onClick={() => setShowModal(false)}
            disabled={isPending || isLoading}
          />
          <Button
            type="submit"
            variant={action === "deleted" ? "danger" : "primary"}
            className="h-8 w-fit px-3"
            text={CONFIRM_TEXT[action]}
            loading={isPending || isLoading}
          />
        </div>
      </form>
    </Modal>
  );
}

export function useConfirmRewardChangeModal() {
  const [state, setState] = useState<{
    action: RewardChangeAction;
    event: EventType;
    reward: ConfirmRewardChangeModalProps["reward"];
    onConfirm: (changeDescription?: string) => Promise<void>;
    isPending?: boolean;
    partnerCount?: number;
  } | null>(null);

  return {
    openConfirmRewardChangeModal: (options: {
      action: RewardChangeAction;
      event: EventType;
      reward: ConfirmRewardChangeModalProps["reward"];
      partnerCount?: number;
      onConfirm: (changeDescription?: string) => Promise<void>;
      isPending?: boolean;
    }) => setState(options),
    closeConfirmRewardChangeModal: () => setState(null),
    ConfirmRewardChangeModal: state ? (
      <ConfirmRewardChangeModal
        showModal
        setShowModal={(show) => {
          if (!show) setState(null);
        }}
        action={state.action}
        event={state.event}
        reward={state.reward}
        partnerCount={state.partnerCount}
        onConfirm={state.onConfirm}
        isPending={state.isPending}
      />
    ) : null,
  };
}
