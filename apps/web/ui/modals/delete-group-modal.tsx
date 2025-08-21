import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { GroupExtendedProps } from "@/lib/types";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { pluralize } from "@dub/utils";
import { Users } from "lucide-react";
import { FormEvent, useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { GroupColorCircle } from "../partners/groups/group-color-circle";

interface DeleteGroupModalProps {
  group: Pick<GroupExtendedProps, "id" | "name" | "color" | "partners">;
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  onDelete?: () => void;
}

const DeleteGroupModal = ({
  group,
  showModal,
  setShowModal,
  onDelete,
}: DeleteGroupModalProps) => {
  const workspace = useWorkspace();
  const { isMobile } = useMediaQuery();
  const { makeRequest: deleteGroup, isSubmitting } = useApiMutation();

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    await deleteGroup(`/api/groups/${group.id}`, {
      method: "DELETE",
      onSuccess: async () => {
        toast.success(`Group deleted successfully!`);
        await mutatePrefix(`/api/groups?workspaceId=${workspace.id}`);
        setShowModal(false);
        onDelete?.();
      },
    });
  };

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="truncate text-lg font-medium">Delete group</h3>
      </div>

      <div className="bg-neutral-50">
        <form onSubmit={onSubmit}>
          <div className="flex flex-col gap-y-4 px-4 py-6 text-left sm:px-6">
            <div className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-6 py-4">
              <div className="flex items-center gap-2">
                <GroupColorCircle group={group} />
                <h4 className="truncate text-lg font-semibold text-neutral-900">
                  {group.name}
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <Users className="size-4" />
                <span className="text-content-default text-sm font-medium">
                  {group.partners} {pluralize("partner", group.partners)}
                </span>
              </div>
            </div>

            <div className="text-sm font-normal text-neutral-800">
              <h4>Deleting this group will do the following:</h4>

              <ul className="mt-0.5 list-outside list-disc space-y-px pl-4">
                <li>Rewards created for this group will be deleted.</li>
                <li>Discount created for this group will be deleted.</li>

                {group.partners && group.partners > 0 ? (
                  <>
                    <li>
                      Partners in this group will be moved to your{" "}
                      <strong>Default</strong> group.
                    </li>
                    <li>
                      Partners in this group will have their rewards and
                      discount updated to the <strong>Default</strong> group
                      settings.
                    </li>
                  </>
                ) : null}
              </ul>

              <p className="mt-4">
                This action cannot be undone – proceed with caution.
              </p>
            </div>

            <div className="border-t border-neutral-300"></div>

            <div>
              <div className="flex items-center gap-2">
                <p className="block text-sm text-neutral-500">
                  To verify, type{" "}
                  <span className="font-medium text-neutral-700">
                    Delete group
                  </span>{" "}
                  below
                </p>
              </div>

              <div className="mt-2">
                <div className="-m-1 rounded-[0.625rem] p-1">
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    className="block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                    aria-invalid="true"
                    autoFocus={!isMobile}
                    pattern="Delete group"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-neutral-200 px-4 py-4 sm:px-6">
            <Button
              type="button"
              variant="secondary"
              text="Cancel"
              className="h-9 w-fit"
              onClick={() => setShowModal(false)}
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              text="Delete group"
              variant="danger"
              loading={isSubmitting}
              className="h-9 w-fit"
            />
          </div>
        </form>
      </div>
    </Modal>
  );
};

export function useDeleteGroupModal(
  group: Pick<GroupExtendedProps, "id" | "name" | "color" | "partners">,
  onDelete?: () => void,
) {
  const [showDeleteGroupModal, setShowDeleteGroupModal] = useState(false);

  const DeleteGroupModalCallback = useCallback(() => {
    return (
      <DeleteGroupModal
        showModal={showDeleteGroupModal}
        setShowModal={setShowDeleteGroupModal}
        group={group}
        onDelete={onDelete}
      />
    );
  }, [showDeleteGroupModal, setShowDeleteGroupModal, onDelete, group]);

  return useMemo(
    () => ({
      setShowDeleteGroupModal,
      DeleteGroupModal: DeleteGroupModalCallback,
    }),
    [setShowDeleteGroupModal, DeleteGroupModalCallback],
  );
}
