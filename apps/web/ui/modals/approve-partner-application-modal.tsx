import { approvePartnerAction } from "@/lib/actions/partners/approve-partner";
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

interface ApprovePartnerApplicationModalProps {
  showApprovePartnerApplicationModal: boolean;
  setShowApprovePartnerApplicationModal: Dispatch<SetStateAction<boolean>>;
  partner: Pick<PartnerProps, "id" | "name" | "email" | "image">;
  groupId?: string | null;
  onConfirm?: () => void | Promise<void>;
  confirmShortcutOptions?: {
    modal?: boolean;
    sheet?: boolean;
  };
}

export function ApprovePartnerApplicationModal({
  showApprovePartnerApplicationModal,
  setShowApprovePartnerApplicationModal,
  partner,
  groupId,
  onConfirm,
  confirmShortcutOptions,
}: ApprovePartnerApplicationModalProps) {
  const { id: workspaceId } = useWorkspace();

  const { executeAsync: approvePartnerApplication, isPending } = useAction(
    approvePartnerAction,
    {
      onSuccess: async () => {
        toast.success(
          `Partner ${partner.email} has been approved to your program.`,
        );
        setShowApprovePartnerApplicationModal(false);
        await onConfirm?.();
      },
      onError: ({ error }) => {
        toast.error(error.serverError || "Failed to approve partner.");
      },
    },
  );

  const handleConfirm = useCallback(async () => {
    if (!workspaceId || !partner) return;

    await approvePartnerApplication({
      workspaceId,
      partnerId: partner.id,
      groupId: groupId ?? undefined,
    });
  }, [workspaceId, partner, groupId, approvePartnerApplication]);

  const handleClose = useCallback(() => {
    setShowApprovePartnerApplicationModal(false);
  }, [setShowApprovePartnerApplicationModal]);

  useKeyboardShortcut("a", handleConfirm, {
    enabled: showApprovePartnerApplicationModal,
    ...(confirmShortcutOptions || { modal: true }),
  });

  return (
    <Modal
      showModal={showApprovePartnerApplicationModal}
      setShowModal={setShowApprovePartnerApplicationModal}
      onClose={handleClose}
    >
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          Approve application
        </h3>
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
        </div>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 p-4">
        <Button
          variant="secondary"
          text="Cancel"
          className="h-8 w-fit px-3"
          onClick={handleClose}
          disabled={isPending}
        />
        <Button
          className="h-8 w-fit px-3"
          text="Approve"
          variant="primary"
          loading={isPending}
          autoFocus
          shortcut="A"
          onClick={handleConfirm}
        />
      </div>
    </Modal>
  );
}

export function useApprovePartnerApplicationModal({
  partner,
  groupId,
  onConfirm,
  confirmShortcutOptions,
}: {
  partner: Pick<PartnerProps, "id" | "name" | "email" | "image">;
  groupId?: string | null;
  onConfirm?: () => void | Promise<void>;
  confirmShortcutOptions?: {
    modal?: boolean;
    sheet?: boolean;
  };
}) {
  const [
    showApprovePartnerApplicationModal,
    setShowApprovePartnerApplicationModal,
  ] = useState(false);

  const ApprovePartnerApplicationModalCallback = useMemo(() => {
    return (
      <ApprovePartnerApplicationModal
        showApprovePartnerApplicationModal={showApprovePartnerApplicationModal}
        setShowApprovePartnerApplicationModal={
          setShowApprovePartnerApplicationModal
        }
        partner={partner}
        groupId={groupId}
        onConfirm={onConfirm}
        confirmShortcutOptions={confirmShortcutOptions}
      />
    );
  }, [
    showApprovePartnerApplicationModal,
    partner,
    groupId,
    onConfirm,
    confirmShortcutOptions,
  ]);

  return useMemo(
    () => ({
      setShowApprovePartnerApplicationModal,
      ApprovePartnerApplicationModal: ApprovePartnerApplicationModalCallback,
    }),
    [
      setShowApprovePartnerApplicationModal,
      ApprovePartnerApplicationModalCallback,
    ],
  );
}
