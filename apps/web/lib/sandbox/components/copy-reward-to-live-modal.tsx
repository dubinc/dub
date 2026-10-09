"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import type { RewardProps } from "@/lib/types";
import { toast } from "sonner";
import { copyRewardToLiveAction } from "../copy-reward-to-live";
import { createCopyToLiveModalHook } from "./copy-to-live-modal";

const useCopyToLiveModal = createCopyToLiveModalHook<
  RewardProps,
  {
    workspaceId: string;
    rewardId: string;
    targetGroupId: string;
  }
>({
  title: "Copy reward to live group",
  getHint: (reward) => `Select a group with no ${reward.event} reward set up`,
  successMessage: "Reward copied to live program!",
  serverAction: copyRewardToLiveAction,
  buildInput: (targetGroupId, workspaceId, reward) => ({
    workspaceId,
    rewardId: reward.id,
    targetGroupId,
  }),
  onError(error) {
    toast.error(parseActionError(error, "Failed to copy reward to live."));
  },
});

export function useCopyRewardToLiveModal() {
  const { openCopyToLiveModal, CopyToLiveModal } = useCopyToLiveModal();

  return {
    openCopyRewardToLiveModal: openCopyToLiveModal,
    CopyRewardToLiveModal: CopyToLiveModal,
  };
}
