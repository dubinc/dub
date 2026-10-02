import { approveProgramApplicationAction } from "@/lib/actions/partners/approve-program-application";
import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerProps } from "@/lib/types";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { Button, Modal, useKeyboardShortcut } from "@dub/ui";
import { isWorkspaceBillingTrialActive } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { useTrialLimitActivateModal } from "./trial-limit-activate-modal";

interface ApproveProgramApplicationModalProps {
  showApproveProgramApplicationModal: boolean;
  setShowApproveProgramApplicationModal: Dispatch<SetStateAction<boolean>>;
  partner: Pick<PartnerProps, "id" | "name" | "email" | "image">;
  groupId?: string | null;
  onConfirm?: () => void | Promise<void>;
  confirmShortcutOptions?: {
    modal?: boolean;
    sheet?: boolean;
  };
}

export function ApproveProgramApplicationModal({
  showApproveProgramApplicationModal,
  setShowApproveProgramApplicationModal,
  partner,
  groupId,
  onConfirm,
  confirmShortcutOptions,
}: ApproveProgramApplicationModalProps) {
  const { id: workspaceId, trialEndsAt } = useWorkspace();

  const { openTrialLimitModal, TrialLimitActivateModal } =
    useTrialLimitActivateModal();

  const trialActive = isWorkspaceBillingTrialActive(trialEndsAt);

  const { executeAsync: approveProgramApplication, isPending } = useAction(
    approveProgramApplicationAction,
    {
      onSuccess: async () => {
        toast.success(
          `Partner ${partner.email} has been approved to your program.`,
        );
        setShowApproveProgramApplicationModal(false);
        await onConfirm?.();
      },
      onError: ({ error }) => {
        const msg = String(error.serverError ?? "");
        if (
          trialActive &&
          (msg.includes("free trial") || msg.includes("enrolled partners"))
        ) {
          openTrialLimitModal("partnerEnrollments");
        } else {
          toast.error(msg || "Failed to approve partner.");
        }
      },
    },
  );

  const handleConfirm = useCallback(async () => {
    if (!workspaceId || !partner) return;

    await approveProgramApplication({
      workspaceId,
      partnerId: partner.id,
      groupId: groupId ?? undefined,
    });
  }, [workspaceId, partner, groupId, approveProgramApplication]);

  const handleClose = useCallback(() => {
    setShowApproveProgramApplicationModal(false);
  }, [setShowApproveProgramApplicationModal]);

  useKeyboardShortcut("a", handleConfirm, {
    enabled: showApproveProgramApplicationModal,
    ...(confirmShortcutOptions || { modal: true }),
  });

  return (
    <>
      <Modal
        showModal={showApproveProgramApplicationModal}
        setShowModal={setShowApproveProgramApplicationModal}
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
      <TrialLimitActivateModal />
    </>
  );
}

export function useApproveProgramApplicationModal({
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
    showApproveProgramApplicationModal,
    setShowApproveProgramApplicationModal,
  ] = useState(false);

  const ApproveProgramApplicationModalCallback = useMemo(() => {
    return (
      <ApproveProgramApplicationModal
        showApproveProgramApplicationModal={showApproveProgramApplicationModal}
        setShowApproveProgramApplicationModal={
          setShowApproveProgramApplicationModal
        }
        partner={partner}
        groupId={groupId}
        onConfirm={onConfirm}
        confirmShortcutOptions={confirmShortcutOptions}
      />
    );
  }, [
    showApproveProgramApplicationModal,
    partner,
    groupId,
    onConfirm,
    confirmShortcutOptions,
  ]);

  return useMemo(
    () => ({
      setShowApproveProgramApplicationModal,
      ApproveProgramApplicationModal: ApproveProgramApplicationModalCallback,
    }),
    [
      setShowApproveProgramApplicationModal,
      ApproveProgramApplicationModalCallback,
    ],
  );
}
