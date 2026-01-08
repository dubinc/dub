import { reactivatePartnerAction } from "@/lib/actions/partners/reactivate-partner";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerProps } from "@/lib/types";
import { Button, Modal } from "@dub/ui";
import { OG_AVATAR_URL } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

function ReactivatePartnerModal({
  showReactivatePartnerModal,
  setShowReactivatePartnerModal,
  partner,
}: {
  showReactivatePartnerModal: boolean;
  setShowReactivatePartnerModal: Dispatch<SetStateAction<boolean>>;
  partner: Pick<PartnerProps, "id" | "name" | "email" | "image">;
}) {
  const { id: workspaceId } = useWorkspace();

  const { executeAsync, isPending } = useAction(reactivatePartnerAction, {
    onSuccess: async () => {
      toast.success("Partner reactivated successfully!");
      setShowReactivatePartnerModal(false);
      mutatePrefix("/api/partners");
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const handleReactivate = useCallback(async () => {
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
      showModal={showReactivatePartnerModal}
      setShowModal={setShowReactivatePartnerModal}
    >
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Reactivate partner</h3>
      </div>

      <div className="flex flex-col gap-6 bg-neutral-50 p-4 sm:p-6">
        <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-3">
          <div className="flex items-center gap-4">
            <img
              src={partner.image || `${OG_AVATAR_URL}${partner.id}`}
              alt={partner.id}
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

        <p className="text-sm text-neutral-600">
          This will reactivate the partner and enable all their active links.
          They will be able to generate commissions again.
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 bg-neutral-50 px-4 pb-5 sm:px-6">
        <Button
          onClick={() => setShowReactivatePartnerModal(false)}
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
        />
        <Button
          type="button"
          variant="primary"
          text="Reactivate partner"
          loading={isPending}
          onClick={handleReactivate}
          className="h-8 w-fit px-3"
        />
      </div>
    </Modal>
  );
}

export function useReactivatePartnerModal({
  partner,
}: {
  partner: Pick<PartnerProps, "id" | "name" | "email" | "image">;
}) {
  const [showReactivatePartnerModal, setShowReactivatePartnerModal] =
    useState(false);

  const ReactivatePartnerModalCallback = useCallback(() => {
    return (
      <ReactivatePartnerModal
        showReactivatePartnerModal={showReactivatePartnerModal}
        setShowReactivatePartnerModal={setShowReactivatePartnerModal}
        partner={partner}
      />
    );
  }, [showReactivatePartnerModal, setShowReactivatePartnerModal, partner]);

  return useMemo(
    () => ({
      setShowReactivatePartnerModal,
      ReactivatePartnerModal: ReactivatePartnerModalCallback,
    }),
    [setShowReactivatePartnerModal, ReactivatePartnerModalCallback],
  );
}
