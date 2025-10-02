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
      <div className="flex flex-col items-center justify-center space-y-3 border-b border-neutral-200 px-4 py-8 sm:px-10">
        <img
          src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
          alt={partner.name}
          className="size-12 rounded-full"
        />

        <div className="flex flex-col text-center">
          <h3 className="text-lg font-semibold leading-7">{partner.name}</h3>
          <p className="text-sm font-medium leading-5 text-neutral-500">
            {partner.email}
          </p>
        </div>

        <p className="text-balance text-center text-sm font-normal leading-5 text-neutral-600">
          This will reactivate the partner and enable all their active links.
          They will be able to generate commissions again.
        </p>
      </div>

      <div className="flex flex-col gap-4 bg-neutral-50 px-4 py-8 sm:rounded-b-2xl sm:px-12">
        <Button
          type="button"
          variant="primary"
          text="Reactivate partner"
          loading={isPending}
          onClick={handleReactivate}
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
