import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { Button, Modal } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";

type EditPartnerTagsModalProps = {
  showEditPartnerTagsModal: boolean;
  setShowEditPartnerTagsModal: Dispatch<SetStateAction<boolean>>;
  partners: (Pick<EnrolledPartnerProps, "id" | "groupId" | "name" | "image"> &
    Partial<Pick<EnrolledPartnerProps, "email">>)[];
};

function EditPartnerTagsModal({
  showEditPartnerTagsModal,
  setShowEditPartnerTagsModal,
  partners,
}: EditPartnerTagsModalProps) {
  const { id: workspaceId } = useWorkspace();

  const { makeRequest: changeGroup, isSubmitting } = useApiMutation();

  const handleEditPartnerTags = useCallback(async () => {
    // await changeGroup(`/api/groups/${selectedGroupId}/partners`, {
    //   method: "POST",
    //   body: {
    //     workspaceId,
    //     partnerIds: partners.map((p) => p.id),
    //   },
    //   onSuccess: () => {
    //     mutatePrefix("/api/partners");
    //     toast.success("Group changed successfully!");
    //     setShowEditPartnerTagsModal(false);
    //   },
    // });
  }, [changeGroup, partners]);

  return (
    <Modal
      showModal={showEditPartnerTagsModal}
      setShowModal={setShowEditPartnerTagsModal}
    >
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Partner tags</h3>
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
                {partners[0].email && (
                  <p className="truncate text-xs text-neutral-500">
                    {partners[0].email}
                  </p>
                )}
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
        {/* TODO */}
        tags
      </div>

      <div className="flex items-center justify-end gap-2 bg-neutral-50 px-4 pb-5 sm:px-6">
        <Button
          onClick={() => setShowEditPartnerTagsModal(false)}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
        />
        <Button
          onClick={() => handleEditPartnerTags()}
          // disabled={!selectedGroupId}
          autoFocus
          loading={isSubmitting}
          text="Change group"
          className="h-8 w-fit px-3"
        />
      </div>
    </Modal>
  );
}

export function useEditPartnerTagsModal({
  partners,
}: Pick<EditPartnerTagsModalProps, "partners">) {
  const [showEditPartnerTagsModal, setShowEditPartnerTagsModal] =
    useState(false);

  const EditPartnerTagsModalCallback = useCallback(() => {
    return (
      <EditPartnerTagsModal
        showEditPartnerTagsModal={showEditPartnerTagsModal}
        setShowEditPartnerTagsModal={setShowEditPartnerTagsModal}
        partners={partners}
      />
    );
  }, [showEditPartnerTagsModal, setShowEditPartnerTagsModal, partners]);

  return useMemo(
    () => ({
      setShowEditPartnerTagsModal,
      EditPartnerTagsModal: EditPartnerTagsModalCallback,
    }),
    [setShowEditPartnerTagsModal, EditPartnerTagsModalCallback],
  );
}
