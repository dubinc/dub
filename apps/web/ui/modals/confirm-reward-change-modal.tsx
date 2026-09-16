"use client";

import {
  shouldNotifyRewardChange,
  type RewardNotificationAction,
  type RewardNotificationTarget,
} from "@/lib/rewards/should-notify-reward-change";
import { RewardProps } from "@/lib/types";
import { REWARD_CHANGE_DESCRIPTION_MAX_LENGTH } from "@/lib/zod/schemas/rewards";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { REWARD_EVENT_DESCRIPTIONS } from "@/ui/partners/rewards/reward-event-descriptions";
import { MaxCharactersCounter } from "@/ui/shared/max-characters-counter";
import { Button, Modal } from "@dub/ui";
import { cn, pluralize } from "@dub/utils";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { PartnerEmailNotificationTooltipHelper } from "../shared/partner-email-notification-tooltip-helper";

export type RewardChangeAction = RewardNotificationAction;

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

const GROUP_CHANGE_COPY: Record<RewardChangeAction, string> = {
  created: "added to",
  updated: "updated for",
  deleted: "removed from",
};

type ConfirmRewardChangeFormData = {
  activityDescription: string;
};

type RewardSnapshot = Pick<
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

type ConfirmRewardChangeOptions = {
  action: RewardChangeAction;
  target: RewardNotificationTarget;
  isDefault?: boolean;
  reward: RewardSnapshot;
  partnerCount?: number;
  onConfirm: (activityDescription?: string) => Promise<void>;
  isPending?: boolean;
};

type ConfirmRewardChangeModalProps = ConfirmRewardChangeOptions & {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
};

function getDescription({
  action,
  target,
  partnerCount,
}: {
  action: RewardChangeAction;
  target: RewardNotificationTarget;
  partnerCount?: number;
}) {
  if (target === "partner") {
    return (
      <>
        The reward below will be updated for this partner, and they will be{" "}
        <PartnerEmailNotificationTooltipHelper />.
      </>
    );
  }

  if (target === "link") {
    return (
      <>
        The reward below will be updated for this link, and the partner will be{" "}
        <PartnerEmailNotificationTooltipHelper />.
      </>
    );
  }

  return (
    <>
      The reward below will be {GROUP_CHANGE_COPY[action]} the group
      {partnerCount && partnerCount > 0 ? (
        <>
          , and {partnerCount} {pluralize("partner", partnerCount)} will be{" "}
          <PartnerEmailNotificationTooltipHelper />
        </>
      ) : (
        ""
      )}
      .
    </>
  );
}

export function ConfirmRewardChangeModal({
  showModal,
  setShowModal,
  action,
  reward,
  partnerCount,
  target,
  onConfirm,
  isPending = false,
}: ConfirmRewardChangeModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { icon: Icon, title } = REWARD_EVENT_DESCRIPTIONS[reward.event];
  const messageLabel =
    target === "group" ? "Message to partners" : "Message to partner";

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ConfirmRewardChangeFormData>({
    defaultValues: {
      activityDescription: "",
    },
  });

  useEffect(() => {
    if (showModal) {
      reset({ activityDescription: "" });
    }
  }, [showModal, reset]);

  const onSubmit = handleSubmit(async ({ activityDescription }) => {
    setIsLoading(true);
    try {
      const trimmedDescription = activityDescription.trim();
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
            {getDescription({ action, target, partnerCount })}
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
                htmlFor="activityDescription"
                className="text-content-emphasis text-sm font-medium"
              >
                {messageLabel}
                <span className="ml-1 font-normal text-neutral-500">
                  (optional)
                </span>
              </label>
              <MaxCharactersCounter
                name="activityDescription"
                maxLength={REWARD_CHANGE_DESCRIPTION_MAX_LENGTH}
                control={control}
              />
            </div>
            <textarea
              id="activityDescription"
              rows={3}
              maxLength={REWARD_CHANGE_DESCRIPTION_MAX_LENGTH}
              placeholder="Add context about this change..."
              className={cn(
                "mt-2 block w-full rounded-md border-neutral-300 text-sm text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500",
                errors.activityDescription && "border-red-600",
              )}
              {...register("activityDescription", {
                maxLength: {
                  value: REWARD_CHANGE_DESCRIPTION_MAX_LENGTH,
                  message: `Must be ${REWARD_CHANGE_DESCRIPTION_MAX_LENGTH} characters or fewer`,
                },
              })}
            />
            {errors.activityDescription && (
              <p className="mt-1 text-xs text-red-600">
                {errors.activityDescription.message}
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
  const [state, setState] = useState<ConfirmRewardChangeOptions | null>(null);

  const confirmRewardChange = useCallback(
    async (options: ConfirmRewardChangeOptions) => {
      const shouldNotify = shouldNotifyRewardChange({
        action: options.action,
        target: options.target,
        isDefault: options.isDefault,
        partnerCount: options.partnerCount,
      });

      if (!shouldNotify) {
        if (options.action === "deleted") {
          if (!window.confirm("Are you sure you want to delete this reward?")) {
            return;
          }
        }

        await options.onConfirm();
        return;
      }

      setState(options);
    },
    [],
  );

  return {
    confirmRewardChange,
    ConfirmRewardChangeModal: state ? (
      <ConfirmRewardChangeModal
        showModal
        setShowModal={(show) => {
          if (!show) setState(null);
        }}
        {...state}
      />
    ) : null,
  };
}
