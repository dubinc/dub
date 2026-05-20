"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import useWorkspace from "@/lib/swr/use-workspace";
import useWorkspaces from "@/lib/swr/use-workspaces";
import type { GroupProps, RewardProps } from "@/lib/types";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { Button, Combobox, type ComboboxOption, Modal } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { copyRewardToLiveAction } from "./copy-reward-to-live";

function CopyRewardToLiveModal({
  showModal,
  setShowModal,
  reward,
}: {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  reward: RewardProps;
}) {
  const { id: workspaceId } = useWorkspace();
  const { workspaces } = useWorkspaces();

  const [selectedGroup, setSelectedGroup] = useState<ComboboxOption | null>(
    null,
  );

  const liveWorkspace = workspaces?.find(
    (w) => w.stagingWorkspaceId === workspaceId,
  );

  const { data: liveGroups, isLoading: liveGroupsLoading } = useSWR<
    GroupProps[]
  >(
    showModal && liveWorkspace?.id
      ? `/api/groups?workspaceId=${liveWorkspace.id}&sortBy=totalSaleAmount`
      : null,
    fetcher,
  );

  const groupOptions = (liveGroups ?? []).map((group) => ({
    value: group.id,
    label: group.name,
    icon: <GroupColorCircle group={group} />,
  }));

  const { executeAsync, isPending } = useAction(copyRewardToLiveAction, {
    onSuccess: () => {
      setShowModal(false);
      setSelectedGroup(null);
      toast.success("Reward copied to live program group!");
    },
    onError({ error }) {
      toast.error(parseActionError(error, "Failed to copy reward to live"));
    },
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !workspaceId) return;

    await executeAsync({
      workspaceId,
      rewardId: reward.id,
      targetGroupId: selectedGroup.value,
    });
  };

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">Copy reward to live group</h3>
      </div>

      <div className="bg-neutral-50">
        <form onSubmit={onSubmit}>
          <div className="flex flex-col gap-4 px-4 py-6 text-left sm:px-6">
            <div>
              <label className="text-sm font-medium text-neutral-700">
                Group
              </label>
              <div className="mt-2">
                <Combobox
                  options={groupOptions}
                  selected={selectedGroup}
                  setSelected={setSelectedGroup}
                  placeholder={
                    liveGroupsLoading ? "Loading groups..." : "Select a group"
                  }
                  searchPlaceholder="Search groups..."
                  caret
                  matchTriggerWidth
                  buttonProps={{
                    className:
                      "w-full justify-start border-neutral-300 px-3 data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
                  }}
                >
                  {selectedGroup ? (
                    <span>{selectedGroup.label}</span>
                  ) : liveGroupsLoading ? (
                    "Loading groups..."
                  ) : (
                    "Select a group"
                  )}
                </Combobox>
              </div>
              <p className="mt-2 text-xs font-normal text-neutral-500">
                Select a group with no {reward.event} reward set up
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-neutral-200 px-4 py-4 sm:px-6">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                text="Cancel"
                className="h-8 w-fit rounded-lg"
                onClick={() => setShowModal(false)}
                disabled={isPending}
              />
              <Button
                type="submit"
                text="Confirm"
                className="h-8 w-fit rounded-lg"
                loading={isPending}
                disabled={!selectedGroup}
              />
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export function useCopyRewardToLiveModal() {
  const [reward, setReward] = useState<RewardProps | null>(null);

  const openCopyRewardToLiveModal = useCallback((reward: RewardProps) => {
    setReward(reward);
  }, []);

  const closeCopyRewardToLiveModal = useCallback(() => {
    setReward(null);
  }, []);

  const CopyRewardToLiveModalCallback = useCallback(() => {
    if (!reward) return null;

    return (
      <CopyRewardToLiveModal
        reward={reward}
        showModal
        setShowModal={(show) => {
          if (!show) closeCopyRewardToLiveModal();
        }}
      />
    );
  }, [reward, closeCopyRewardToLiveModal]);

  return useMemo(
    () => ({
      openCopyRewardToLiveModal,
      CopyRewardToLiveModal: CopyRewardToLiveModalCallback,
    }),
    [openCopyRewardToLiveModal, CopyRewardToLiveModalCallback],
  );
}
