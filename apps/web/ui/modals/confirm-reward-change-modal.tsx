"use client";

import { RewardProps } from "@/lib/types";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { REWARD_EVENT_DESCRIPTIONS } from "@/ui/partners/rewards/reward-event-descriptions";
import { Button, Modal } from "@dub/ui";
import { pluralize } from "@dub/utils";
import { EventType } from "@prisma/client";
import { useState } from "react";
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
  onConfirm: () => Promise<void>;
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

  const change = {
    created: "added to",
    updated: "updated for",
    deleted: "removed from",
  }[action];

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      setShowModal(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="max-w-md"
    >
      <div className="px-5 py-4 text-left">
        <h3 className="text-content-emphasis text-base font-semibold">
          {TITLES[action]}
        </h3>
        <p className="text-content-subtle mt-1 text-sm">
          The reward below will be {change} the group
          {partnerCount && partnerCount > 0 ? (
            <>
              , and {partnerCount} {pluralize("partner", partnerCount)} will be{" "}
              <PartnerEmailNotificationTooltipHelper />
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
      </div>

      <div className="border-border-subtle flex items-center justify-end gap-2 border-t px-5 py-4">
        <Button
          variant="secondary"
          className="h-8 w-fit px-3"
          text="Cancel"
          onClick={() => setShowModal(false)}
          disabled={isPending || isLoading}
        />
        <Button
          variant={action === "deleted" ? "danger" : "primary"}
          className="h-8 w-fit px-3"
          text={CONFIRM_TEXT[action]}
          loading={isPending || isLoading}
          onClick={handleConfirm}
        />
      </div>
    </Modal>
  );
}

export function useConfirmRewardChangeModal() {
  const [state, setState] = useState<{
    action: RewardChangeAction;
    event: EventType;
    reward: ConfirmRewardChangeModalProps["reward"];
    onConfirm: () => Promise<void>;
    isPending?: boolean;
    partnerCount?: number;
  } | null>(null);

  return {
    openConfirmRewardChangeModal: (options: {
      action: RewardChangeAction;
      event: EventType;
      reward: ConfirmRewardChangeModalProps["reward"];
      partnerCount?: number;
      onConfirm: () => Promise<void>;
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
