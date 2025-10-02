import { archivePartnerAction } from "@/lib/actions/partners/archive-partner";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { EnrolledPartnerProps } from "@/lib/types";
import { Button, Modal } from "@dub/ui";
import { capitalize, OG_AVATAR_URL } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

function ArchivePartnerModal({
  showArchivePartnerModal,
  setShowArchivePartnerModal,
  partner,
}: {
  showArchivePartnerModal: boolean;
  setShowArchivePartnerModal: Dispatch<SetStateAction<boolean>>;
  partner: EnrolledPartnerProps;
}) {
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const actionText = partner.status === "archived" ? "unarchive" : "archive";
  const actionDescription =
    partner.status === "archived"
      ? "This will show the partner in your partners list again."
      : "This will hide the partner from your partners list. All their links will still work, and they will still earn commissions.";

  const { executeAsync, isPending } = useAction(archivePartnerAction, {
    onSuccess: async () => {
      toast.success(`Partner ${actionText}d successfully!`);
      setShowArchivePartnerModal(false);
      mutatePrefix("/api/partners");
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const handleArchive = useCallback(async () => {
    if (!workspaceId || !partner.id) {
      return;
    }

    await executeAsync({
      workspaceId,
      partnerId: partner.id,
    });
  }, [executeAsync, partner.id, workspaceId]);

  return (
    <Modal
      showModal={showArchivePartnerModal}
      setShowModal={setShowArchivePartnerModal}
    >
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          {capitalize(actionText)} partner
        </h3>
      </div>

      <div className="flex flex-col gap-6 bg-neutral-50 p-4 sm:p-6">
        <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-3">
          <div className="flex items-center gap-4">
            <img
              src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
              alt={partner.name}
              className="size-10 rounded-full bg-white"
            />
            <div className="flex min-w-0 flex-col">
              <h4 className="truncate text-sm font-medium text-neutral-900">
                {partner.name}
              </h4>
              <p className="truncate text-xs text-neutral-500">
                {partner.email}
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-neutral-600">{actionDescription}</p>
      </div>

      <div className="flex items-center justify-end gap-2 bg-neutral-50 px-4 pb-5 sm:px-6">
        <Button
          onClick={() => setShowArchivePartnerModal(false)}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
        />
        <Button
          onClick={handleArchive}
          autoFocus
          loading={isPending}
          text={`Confirm ${actionText}`}
          className="h-8 w-fit px-3"
        />
      </div>
    </Modal>
  );
}

export function useArchivePartnerModal({
  partner,
}: {
  partner: EnrolledPartnerProps;
}) {
  const [showArchivePartnerModal, setShowArchivePartnerModal] = useState(false);

  const ArchivePartnerModalCallback = useCallback(() => {
    return (
      <ArchivePartnerModal
        showArchivePartnerModal={showArchivePartnerModal}
        setShowArchivePartnerModal={setShowArchivePartnerModal}
        partner={partner}
      />
    );
  }, [showArchivePartnerModal, setShowArchivePartnerModal, partner]);

  return useMemo(
    () => ({
      setShowArchivePartnerModal,
      ArchivePartnerModal: ArchivePartnerModalCallback,
    }),
    [setShowArchivePartnerModal, ArchivePartnerModalCallback],
  );
}
