import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { Button, Modal } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { GroupSelector } from "./groups/group-selector";

type ChangeGroupModalProps = {
  showChangeGroupModal: boolean;
  setShowChangeGroupModal: Dispatch<SetStateAction<boolean>>;
  partners: EnrolledPartnerProps[];

  /** Called when the selection is confirmed. Return false to prevent persisting the group change. */
  onChangeGroup?: (groupId: string) => void | boolean;
};

function ChangeGroupModal({
  showChangeGroupModal,
  setShowChangeGroupModal,
  partners,
  onChangeGroup,
}: ChangeGroupModalProps) {
  const { id: workspaceId } = useWorkspace();

  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  useEffect(() => {
    if (partners.length === 1) {
      setSelectedGroupId(partners[0].groupId ?? null);
    }
  }, [partners]);

  const { makeRequest: changeGroup, isSubmitting } = useApiMutation();

  const handleChangeGroup = useCallback(async () => {
    await changeGroup(`/api/groups/${selectedGroupId}/partners`, {
      method: "POST",
      body: {
        workspaceId,
        partnerIds: partners.map((p) => p.id),
      },
      onSuccess: () => {
        mutatePrefix("/api/partners");
        toast.success("Group changed successfully!");
        setShowChangeGroupModal(false);
      },
    });
  }, [changeGroup, selectedGroupId, partners]);

  return (
    <Modal
      showModal={showChangeGroupModal}
      setShowModal={setShowChangeGroupModal}
    >
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Change group</h3>
      </div>

      <div className="flex flex-col gap-6 bg-neutral-50 p-4 sm:p-6">
        <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-3">
          {partners.length === 1 ? (
            <div className="flex items-center gap-4">
              <img
                src={partners[0].image || `${OG_AVATAR_URL}${partners[0].name}`}
                alt={partners[0].name}
                className="size-10 rounded-full bg-white"
              />
              <div className="flex min-w-0 flex-col">
                <h4 className="truncate text-sm font-medium text-neutral-900">
                  {partners[0].name}
                </h4>
                <p className="truncate text-xs text-neutral-500">
                  {partners[0].email}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center">
                {partners.slice(0, 3).map((partner, index) => (
                  <img
                    key={partner.id}
                    src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
                    alt={partner.name}
                    className={cn(
                      "inline-block size-7 rounded-full border-2 border-neutral-100 bg-white",
                      index > 0 && "-ml-2.5",
                    )}
                  />
                ))}
              </div>
              <span className="text-base font-semibold text-neutral-900">
                {partners.length} partners selected
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-900">
            New group
          </label>

          <div className="relative mt-1.5 rounded-md shadow-sm">
            <GroupSelector
              selectedGroupId={selectedGroupId}
              setSelectedGroupId={setSelectedGroupId}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 bg-neutral-50 px-4 pb-5 sm:px-6">
        <Button
          onClick={() => setShowChangeGroupModal(false)}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
        />
        <Button
          onClick={() => {
            if (onChangeGroup?.(selectedGroupId!) === false) {
              setShowChangeGroupModal(false);
              return;
            }
            handleChangeGroup();
          }}
          disabled={!selectedGroupId}
          autoFocus
          loading={isSubmitting}
          text="Change group"
          className="h-8 w-fit px-3"
        />
      </div>
    </Modal>
  );
}

export function useChangeGroupModal({
  partners,
  onChangeGroup,
}: Pick<ChangeGroupModalProps, "partners" | "onChangeGroup">) {
  const [showChangeGroupModal, setShowChangeGroupModal] = useState(false);

  const ChangeGroupModalCallback = useCallback(() => {
    return (
      <ChangeGroupModal
        showChangeGroupModal={showChangeGroupModal}
        setShowChangeGroupModal={setShowChangeGroupModal}
        partners={partners}
        onChangeGroup={onChangeGroup}
      />
    );
  }, [showChangeGroupModal, setShowChangeGroupModal, partners]);

  return useMemo(
    () => ({
      setShowChangeGroupModal,
      ChangeGroupModal: ChangeGroupModalCallback,
    }),
    [setShowChangeGroupModal, ChangeGroupModalCallback],
  );
}
