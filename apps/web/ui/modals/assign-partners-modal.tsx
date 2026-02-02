import { bulkAssignPartnersAction } from "@/lib/actions/partners/bulk-assign-partners";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { Button, Modal } from "@dub/ui";
import { cn, OG_AVATAR_URL } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { AssigneeSelector } from "../partners/assignee-selector";

type AssignPartnersModalProps = {
  showAssignPartnersModal: boolean;
  setShowAssignPartnersModal: Dispatch<SetStateAction<boolean>>;
  partners: (Pick<
    EnrolledPartnerProps,
    "id" | "name" | "image" | "managerUserId"
  > &
    Partial<Pick<EnrolledPartnerProps, "email" | "managerUser">>)[];
  /** Called when the selection is confirmed. Return false to prevent persisting. */
  onAssign?: (managerUserId: string | null) => void | boolean;
};

function AssignPartnersModal({
  showAssignPartnersModal,
  setShowAssignPartnersModal,
  partners,
  onAssign,
}: AssignPartnersModalProps) {
  const { id: workspaceId } = useWorkspace();
  const partnerWord = partners.length === 1 ? "partner" : "partners";

  const [selectedManagerUserId, setSelectedManagerUserId] = useState<
    string | null | undefined
  >(undefined);

  useEffect(() => {
    if (partners.length === 1) {
      setSelectedManagerUserId(partners[0].managerUserId ?? null);
    } else {
      setSelectedManagerUserId(undefined);
    }
  }, [partners]);

  const { executeAsync, isPending } = useAction(bulkAssignPartnersAction, {
    onSuccess: () => {
      mutatePrefix("/api/partners");
      const word = partners.length === 1 ? "Partner" : "Partners";
      toast.success(
        selectedManagerUserId
          ? `${word} assigned successfully!`
          : `${word} unassigned successfully!`,
      );
      setShowAssignPartnersModal(false);
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Failed to assign partner.");
    },
  });

  const handleAssign = useCallback(async () => {
    if (!workspaceId) return;

    await executeAsync({
      workspaceId,
      partnerIds: partners.map((p) => p.id),
      managerUserId: selectedManagerUserId ?? null,
    });
  }, [executeAsync, selectedManagerUserId, partners, workspaceId]);

  const currentManagerUser =
    partners.length === 1 ? partners[0].managerUser : undefined;

  return (
    <Modal
      showModal={showAssignPartnersModal}
      setShowModal={setShowAssignPartnersModal}
    >
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Assign {partnerWord}</h3>
      </div>

      <div className="flex flex-col gap-6 bg-neutral-50 p-4 sm:p-6">
        <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-3">
          {partners.length === 1 ? (
            <div className="flex items-center gap-4">
              <img
                src={
                  partners[0].image ||
                  `${OG_AVATAR_URL}${partners[0].name}`
                }
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
                    src={partner.image || `${OG_AVATAR_URL}${partner.id}`}
                    alt={partner.id}
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
            New assignee
          </label>

          <div className="relative mt-1.5 rounded-md shadow-sm">
            <AssigneeSelector
              selectedManagerUserId={selectedManagerUserId}
              setSelectedManagerUserId={setSelectedManagerUserId}
              currentManagerUser={currentManagerUser}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 bg-neutral-50 px-4 pb-5 sm:px-6">
        <Button
          onClick={() => setShowAssignPartnersModal(false)}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
        />
        <Button
          onClick={() => {
            if (onAssign?.(selectedManagerUserId ?? null) === false) {
              setShowAssignPartnersModal(false);
              return;
            }
            handleAssign();
          }}
          disabled={selectedManagerUserId === undefined}
          autoFocus
          loading={isPending}
          text={`Assign ${partnerWord}`}
          className="h-8 w-fit px-3"
        />
      </div>
    </Modal>
  );
}

export function useAssignPartnersModal({
  partners,
  onAssign,
}: Pick<AssignPartnersModalProps, "partners" | "onAssign">) {
  const [showAssignPartnersModal, setShowAssignPartnersModal] = useState(false);

  const AssignPartnersModalCallback = useCallback(() => {
    return (
      <AssignPartnersModal
        showAssignPartnersModal={showAssignPartnersModal}
        setShowAssignPartnersModal={setShowAssignPartnersModal}
        partners={partners}
        onAssign={onAssign}
      />
    );
  }, [showAssignPartnersModal, setShowAssignPartnersModal, partners]);

  return useMemo(
    () => ({
      setShowAssignPartnersModal,
      AssignPartnersModal: AssignPartnersModalCallback,
    }),
    [setShowAssignPartnersModal, AssignPartnersModalCallback],
  );
}
