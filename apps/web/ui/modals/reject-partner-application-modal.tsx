import { rejectPartnerApplicationAction } from "@/lib/actions/partners/reject-partner-application";
import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerProps } from "@/lib/types";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { Button, Modal, useKeyboardShortcut } from "@dub/ui";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

interface RejectPartnerApplicationModalProps {
  showRejectPartnerApplicationModal: boolean;
  setShowRejectPartnerApplicationModal: Dispatch<SetStateAction<boolean>>;
  partner: Pick<PartnerProps, "id" | "name" | "email" | "image">;
  onConfirm?: () => void | Promise<void>;
  confirmShortcutOptions?: {
    modal?: boolean;
    sheet?: boolean;
  };
}

export function RejectPartnerApplicationModal({
  showRejectPartnerApplicationModal,
  setShowRejectPartnerApplicationModal,
  partner,
  onConfirm,
  confirmShortcutOptions,
}: RejectPartnerApplicationModalProps) {
  const { id: workspaceId } = useWorkspace();

  const { executeAsync: rejectPartnerApplication, isPending } = useAction(
    rejectPartnerApplicationAction,
    {
      onSuccess: async () => {
        toast.success(
          `Partner ${partner.email} has been rejected from your program.`,
        );
        setShowRejectPartnerApplicationModal(false);
        await onConfirm?.();
      },
      onError: ({ error }) => {
        toast.error(error.serverError || "Failed to reject partner.");
      },
    },
  );

  const handleConfirm = useCallback(async () => {
    if (!workspaceId || !partner) return;

    await rejectPartnerApplication({
      workspaceId,
      partnerId: partner.id,
    });
  }, [workspaceId, partner, rejectPartnerApplication]);

  const handleClose = useCallback(() => {
    setShowRejectPartnerApplicationModal(false);
  }, [setShowRejectPartnerApplicationModal]);

  useKeyboardShortcut("r", handleConfirm, {
    enabled: showRejectPartnerApplicationModal,
    ...(confirmShortcutOptions || { modal: true }),
  });

  return (
    <Modal
      showModal={showRejectPartnerApplicationModal}
      setShowModal={setShowRejectPartnerApplicationModal}
      onClose={handleClose}
    >
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">Reject application</h3>
      </div>

      {partner && (
        <div className="flex flex-col gap-6 bg-neutral-50 p-4 sm:p-6">
          <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-3">
            <div className="flex items-center gap-4">
              <PartnerAvatar partner={partner} className="size-10 bg-white" />
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
            This will reject the partner application and prevent them from
            joining your program.
          </p>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 bg-neutral-50 px-4 pb-5 sm:px-6">
        <Button
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
          onClick={handleClose}
          disabled={isPending}
        />
        <Button
          className="h-8 w-fit px-3"
          text="Reject"
          variant="primary"
          loading={isPending}
          autoFocus
          shortcut="R"
          onClick={handleConfirm}
        />
      </div>
    </Modal>
  );
}

export function useRejectPartnerApplicationModal({
  partner,
  onConfirm,
  confirmShortcutOptions,
}: {
  partner: Pick<PartnerProps, "id" | "name" | "email" | "image">;
  onConfirm?: () => void | Promise<void>;
  confirmShortcutOptions?: {
    modal?: boolean;
    sheet?: boolean;
  };
}) {
  const [
    showRejectPartnerApplicationModal,
    setShowRejectPartnerApplicationModal,
  ] = useState(false);

  const RejectPartnerApplicationModalCallback = useMemo(() => {
    return (
      <RejectPartnerApplicationModal
        showRejectPartnerApplicationModal={showRejectPartnerApplicationModal}
        setShowRejectPartnerApplicationModal={
          setShowRejectPartnerApplicationModal
        }
        partner={partner}
        onConfirm={onConfirm}
        confirmShortcutOptions={confirmShortcutOptions}
      />
    );
  }, [
    showRejectPartnerApplicationModal,
    partner,
    onConfirm,
    confirmShortcutOptions,
  ]);

  return useMemo(
    () => ({
      setShowRejectPartnerApplicationModal,
      RejectPartnerApplicationModal: RejectPartnerApplicationModalCallback,
    }),
    [
      setShowRejectPartnerApplicationModal,
      RejectPartnerApplicationModalCallback,
    ],
  );
}
