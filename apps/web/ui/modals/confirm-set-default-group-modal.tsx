"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useGroup from "@/lib/swr/use-group";
import { GroupExtendedProps } from "@/lib/types";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { MarkdownDescription } from "@/ui/shared/markdown-description";
import { Button, Modal } from "@dub/ui";
import { ArrowRight } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

type GroupForModal = Pick<GroupExtendedProps, "id" | "name" | "color">;

interface ConfirmSetDefaultGroupModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  newGroup: GroupForModal;
}

function ConfirmSetDefaultGroupModal({
  showModal,
  setShowModal,
  newGroup,
}: ConfirmSetDefaultGroupModalProps) {
  const { makeRequest, isSubmitting } = useApiMutation();

  const { group: currentDefaultGroup } = useGroup({
    groupIdOrSlug: DEFAULT_PARTNER_GROUP.slug,
  });

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await makeRequest(`/api/groups/${newGroup.id}/default`, {
        method: "POST",
        onSuccess: async () => {
          setShowModal(false);
          await mutatePrefix("/api/groups");
          toast.success("Default group updated successfully!");
        },
      });
    },
    [makeRequest, newGroup.id, setShowModal],
  );

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-content-emphasis text-lg font-medium">
          Change default group
        </h3>
      </div>

      <form onSubmit={onSubmit}>
        <div className="flex flex-col gap-4 px-4 py-6 text-left sm:px-6">
          <div className="relative overflow-hidden rounded-lg border border-neutral-200 bg-white p-5">
            <div
              className="pointer-events-none absolute inset-0 bg-neutral-50"
              style={{
                backgroundImage:
                  "radial-gradient(circle, #d4d4d4 1px, transparent 1px)",
                backgroundSize: "16px 16px",
              }}
            />
            <div className="relative flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <GroupColorCircle
                  group={currentDefaultGroup ?? DEFAULT_PARTNER_GROUP}
                />
                <span className="text-content-emphasis text-sm font-medium">
                  {currentDefaultGroup?.name ?? DEFAULT_PARTNER_GROUP.name}
                </span>
              </div>
              <ArrowRight className="size-4 text-neutral-400" />
              <div className="flex items-center gap-2">
                <GroupColorCircle group={newGroup} />
                <span className="text-content-emphasis text-sm font-medium">
                  {newGroup.name}
                </span>
              </div>
            </div>
            <MarkdownDescription className="text-content-subtle relative mt-3 text-center text-xs">
              {`This will set **"${newGroup.name}"** as the new default group and update your [public landing page](https://dub.co/help/article/program-landing-page) and [application form](https://dub.co/help/article/program-application-form).`}
            </MarkdownDescription>
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-neutral-200 px-4 py-4 sm:px-6">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              text="Cancel"
              className="h-8 w-fit"
              onClick={() => setShowModal(false)}
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              text="Confirm change"
              className="h-8 w-fit"
              loading={isSubmitting}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}

export function useConfirmSetDefaultGroupModal() {
  const [newGroup, setNewGroup] = useState<GroupForModal | null>(null);

  const openConfirmSetDefaultGroupModal = useCallback(
    (group: GroupForModal) => {
      setNewGroup(group);
    },
    [],
  );

  const closeConfirmSetDefaultGroupModal = useCallback(
    () => setNewGroup(null),
    [],
  );

  return {
    openConfirmSetDefaultGroupModal,
    closeConfirmSetDefaultGroupModal,
    ConfirmSetDefaultGroupModal: newGroup ? (
      <ConfirmSetDefaultGroupModal
        showModal
        setShowModal={(show) => !show && setNewGroup(null)}
        newGroup={newGroup}
      />
    ) : null,
  };
}
