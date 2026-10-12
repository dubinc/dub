"use client";

import { parseActionError } from "@/lib/actions/parse-action-errors";
import useWorkspace from "@/lib/swr/use-workspace";
import useWorkspaces from "@/lib/swr/use-workspaces";
import type { GroupProps } from "@/lib/types";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { Button, Combobox, type ComboboxOption, Modal } from "@dub/ui";
import { fetcher } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

type ActionError = Parameters<typeof parseActionError>[0];
type CopyToLiveServerAction = Parameters<typeof useAction>[0];

type CopyToLiveModalConfig<T, TInput> = {
  title: string;
  getHint: (item: T) => string;
  successMessage: string;
  serverAction: CopyToLiveServerAction;
  buildInput: (targetGroupId: string, workspaceId: string, item: T) => TInput;
  onError: (error: ActionError) => void;
};

function useLiveGroupOptions(showModal: boolean) {
  const { id: workspaceId } = useWorkspace();
  const { workspaces } = useWorkspaces();

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

  return {
    workspaceId,
    groupOptions,
    liveGroupsLoading,
  };
}

function CopyToLiveModal<T, TInput>({
  showModal,
  setShowModal,
  item,
  title,
  hint,
  successMessage,
  serverAction,
  buildInput,
  onError,
}: {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  item: T;
  title: string;
  hint: string;
  successMessage: string;
  serverAction: CopyToLiveServerAction;
  buildInput: (targetGroupId: string, workspaceId: string, item: T) => TInput;
  onError: (error: ActionError) => void;
}) {
  const [selectedGroup, setSelectedGroup] = useState<ComboboxOption | null>(
    null,
  );

  const { workspaceId, groupOptions, liveGroupsLoading } =
    useLiveGroupOptions(showModal);

  const { executeAsync, isPending } = useAction(serverAction, {
    onSuccess: () => {
      setShowModal(false);
      setSelectedGroup(null);
      toast.success(successMessage);
    },
    onError({ error }) {
      onError(error as ActionError);
    },
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !workspaceId) return;

    await executeAsync(
      buildInput(selectedGroup.value, workspaceId, item) as Parameters<
        typeof executeAsync
      >[0],
    );
  };

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">{title}</h3>
      </div>

      <div className="bg-neutral-50">
        <form onSubmit={onSubmit}>
          <div className="flex flex-col gap-2 px-4 py-6 text-left sm:px-6">
            <label className="text-sm font-medium text-neutral-700">
              Group
            </label>

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

            <p className="text-xs font-normal text-neutral-500">{hint}</p>
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

export function createCopyToLiveModalHook<T, TInput>(
  config: CopyToLiveModalConfig<T, TInput>,
) {
  return function useCopyToLiveModal() {
    const [item, setItem] = useState<T | null>(null);

    const openCopyToLiveModal = useCallback((nextItem: T) => {
      setItem(nextItem);
    }, []);

    const closeCopyToLiveModal = useCallback(() => {
      setItem(null);
    }, []);

    const CopyToLiveModalCallback = useCallback(() => {
      if (!item) return null;

      return (
        <CopyToLiveModal
          item={item}
          showModal
          setShowModal={(show) => {
            if (!show) closeCopyToLiveModal();
          }}
          title={config.title}
          hint={config.getHint(item)}
          successMessage={config.successMessage}
          serverAction={config.serverAction}
          buildInput={config.buildInput}
          onError={config.onError}
        />
      );
    }, [item, closeCopyToLiveModal]);

    return useMemo(
      () => ({
        openCopyToLiveModal,
        CopyToLiveModal: CopyToLiveModalCallback,
      }),
      [openCopyToLiveModal, CopyToLiveModalCallback],
    );
  };
}
