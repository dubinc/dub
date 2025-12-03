import { rejectPartnerApplicationAction } from "@/lib/actions/partners/reject-partner-application";
import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerProps } from "@/lib/types";
import { Button, Checkbox, Modal, useKeyboardShortcut } from "@dub/ui";
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
  const [reportFraud, setReportFraud] = useState(false);

  const { executeAsync: rejectPartnerApplication, isPending } = useAction(
    rejectPartnerApplicationAction,
    {
      onSuccess: async () => {
        toast.success(
          `Partner ${partner.email} has been rejected from your program.`,
        );
        setShowRejectPartnerApplicationModal(false);
        setReportFraud(false);
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
      reportFraud,
    });
  }, [workspaceId, partner, reportFraud, rejectPartnerApplication]);

  const handleClose = useCallback(() => {
    setShowRejectPartnerApplicationModal(false);
    setReportFraud(false);
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
              <img
                src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
                alt={partner.name || "Partner avatar"}
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
            This will reject the partner application and prevent them from
            joining your program.
          </p>

          <label className="flex items-start gap-2.5">
            <Checkbox
              className="mt-1 size-4 rounded border-neutral-300 focus:border-neutral-500 focus:ring-neutral-500 focus-visible:border-neutral-500 focus-visible:ring-neutral-500 data-[state=checked]:bg-black data-[state=indeterminate]:bg-black"
              checked={reportFraud}
              onCheckedChange={(checked) => setReportFraud(Boolean(checked))}
            />
            <span className="text-sm text-neutral-600">
              Select this if you believe the application shows signs of fraud.
              This helps keep the network safe.
            </span>
          </label>
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

  const RejectPartnerApplicationModalCallback = useCallback(() => {
    return (
      <RejectPartnerApplicationModal
        showRejectPartnerApplicationModal={showRejectPartnerApplicationModal}
        setShowRejectPartnerApplicationModal={
          setShowRejectPartnerApplicationModal
        }
        confirmShortcutOptions={confirmShortcutOptions}
        partner={partner}
        onConfirm={onConfirm}
      />
    );
  }, [
    showRejectPartnerApplicationModal,
    setShowRejectPartnerApplicationModal,
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
