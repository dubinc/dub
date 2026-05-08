import { rejectPartnerApplicationAction } from "@/lib/actions/partners/reject-partner-application";
import {
  getProgramApplicationRejectionReasonLabel,
  PROGRAM_APPLICATION_REJECTION_REASON_ORDER,
} from "@/lib/partners/program-application-rejection";
import useWorkspace from "@/lib/swr/use-workspace";
import { PartnerProps } from "@/lib/types";
import {
  MAX_FRAUD_REASON_LENGTH,
  PROGRAM_APPLICATION_REJECTION_NOTE_MAX_LENGTH,
} from "@/lib/zod/schemas/partners";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { ProgramApplicationRejectionReason } from "@dub/prisma/client";
import {
  Button,
  Combobox,
  ComboboxOption,
  InfoTooltip,
  Modal,
  Switch,
  useKeyboardShortcut,
} from "@dub/ui";
import { cn } from "@dub/utils";
import { motion } from "motion/react";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

const REJECTION_REASON_COMBO_OPTIONS: ComboboxOption[] =
  PROGRAM_APPLICATION_REJECTION_REASON_ORDER.map((value) => ({
    value,
    label: getProgramApplicationRejectionReasonLabel(value),
  }));

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
  const allowImmediateReapplyOutcomeRef = useRef(false);

  const [selectedReason, setSelectedReason] = useState<ComboboxOption | null>(
    null,
  );
  const [rejectionNote, setRejectionNote] = useState("");
  const [allowImmediateReapply, setAllowImmediateReapply] = useState(false);
  const [flagForFraud, setFlagForFraud] = useState(false);
  const [flagForFraudReason, setFlagForFraudReason] = useState("");
  const fraudReasonFieldId = useId();
  const fraudReasonCounterId = useId();

  useEffect(() => {
    if (!showRejectPartnerApplicationModal) {
      setSelectedReason(null);
      setRejectionNote("");
      setAllowImmediateReapply(false);
      setFlagForFraud(false);
      setFlagForFraudReason("");
    }
  }, [showRejectPartnerApplicationModal]);

  const { executeAsync: rejectPartnerApplication, isPending } = useAction(
    rejectPartnerApplicationAction,
    {
      onSuccess: async () => {
        toast.success(
          allowImmediateReapplyOutcomeRef.current
            ? `Application rejected — ${partner.email} can reapply immediately.`
            : `Partner ${partner.email} has been rejected from your program.`,
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

    if (flagForFraud && !flagForFraudReason.trim()) {
      toast.error("Fraud reason is required when flagging for fraud.");
      return;
    }

    allowImmediateReapplyOutcomeRef.current = allowImmediateReapply;

    await rejectPartnerApplication({
      workspaceId,
      partnerId: partner.id,
      allowImmediateReapply,
      ...(flagForFraud
        ? { flagForFraud: true, flagForFraudReason: flagForFraudReason.trim() }
        : {}),
      ...(selectedReason && {
        rejectionReason:
          selectedReason.value as ProgramApplicationRejectionReason,
      }),
      ...(rejectionNote ? { rejectionNote } : {}),
    });
  }, [
    workspaceId,
    partner,
    rejectPartnerApplication,
    selectedReason,
    rejectionNote,
    allowImmediateReapply,
    flagForFraud,
    flagForFraudReason,
  ]);

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

          <div>
            <label className="block text-sm font-medium text-neutral-900">
              Reason for rejection (optional)
            </label>
            <Combobox
              options={REJECTION_REASON_COMBO_OPTIONS}
              selected={selectedReason}
              setSelected={setSelectedReason}
              placeholder="Select"
              hideSearch
              caret
              matchTriggerWidth
              buttonProps={{
                className: cn(
                  "mt-1.5 h-9 w-full justify-start border border-neutral-300 bg-white px-3 shadow-sm",
                  "data-[state=open]:border-neutral-500 data-[state=open]:ring-1 data-[state=open]:ring-neutral-500",
                  "focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500",
                  !selectedReason && "text-neutral-400",
                ),
              }}
            />
            <p className="mt-1.5 text-xs text-neutral-500">
              Included in rejection email
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="reject-rejection-note"
                className="block text-sm font-medium text-neutral-900"
              >
                Additional notes (optional)
              </label>
              <span className="text-xs text-neutral-400">
                {rejectionNote.length}/
                {PROGRAM_APPLICATION_REJECTION_NOTE_MAX_LENGTH}
              </span>
            </div>
            <div className="relative mt-1.5 rounded-md shadow-sm">
              <textarea
                id="reject-rejection-note"
                rows={4}
                maxLength={PROGRAM_APPLICATION_REJECTION_NOTE_MAX_LENGTH}
                placeholder="Add context for the partner (optional)"
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                disabled={isPending}
                className={cn(
                  "block w-full resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400",
                  "focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500",
                )}
              />
            </div>
            <p className="mt-1.5 text-xs text-neutral-500">
              Included in rejection email
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "text-sm font-medium text-neutral-900",
                    flagForFraud && "text-neutral-400",
                  )}
                >
                  Allow partner to reapply immediately
                </span>
                <InfoTooltip content="This will skip the 30 day waiting period and allow the partner to resubmit another application." />
              </div>
              <Switch
                checked={allowImmediateReapply}
                disabled={isPending || flagForFraud}
                disabledTooltip={
                  flagForFraud
                    ? 'Turn off "Flag partner for potential fraud" to allow immediate reapply.'
                    : undefined
                }
                fn={(checked: boolean) => {
                  setAllowImmediateReapply(checked);
                  if (checked) {
                    setFlagForFraud(false);
                    setFlagForFraudReason("");
                  }
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-900">
                  Flag partner for potential fraud
                </span>
                <InfoTooltip content="This will report the partner to our fraud team, and if deemed fraudulent, they will be banned from the network." />
              </div>
              <Switch
                checked={flagForFraud}
                disabled={isPending || allowImmediateReapply}
                disabledTooltip={
                  allowImmediateReapply
                    ? 'Turn off "Allow partner to reapply immediately" to flag for fraud.'
                    : undefined
                }
                fn={(checked: boolean) => {
                  setFlagForFraud(checked);
                  if (checked) {
                    setAllowImmediateReapply(false);
                  }
                }}
              />
            </div>
            <motion.div
              initial={false}
              animate={{
                height: flagForFraud ? "auto" : 0,
                opacity: flagForFraud ? 1 : 0,
              }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
              inert={!flagForFraud}
            >
              <div className="mt-1 p-px">
                <textarea
                  id={fraudReasonFieldId}
                  aria-describedby={fraudReasonCounterId}
                  className={cn(
                    "mt-1.5 block w-full rounded-md border border-neutral-300 bg-white text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 sm:text-sm",
                  )}
                  placeholder="Describe the suspected fraudulent activity..."
                  rows={3}
                  maxLength={MAX_FRAUD_REASON_LENGTH}
                  value={flagForFraudReason}
                  onChange={(e) => setFlagForFraudReason(e.target.value)}
                  disabled={isPending}
                />
                <p
                  id={fraudReasonCounterId}
                  className="mt-1 block text-right text-xs tabular-nums text-neutral-400"
                >
                  <span className="sr-only">
                    {flagForFraudReason.length} of {MAX_FRAUD_REASON_LENGTH}{" "}
                    characters entered.{" "}
                    {Math.max(
                      0,
                      MAX_FRAUD_REASON_LENGTH - flagForFraudReason.length,
                    )}{" "}
                    characters remaining.
                  </span>
                  <span aria-hidden="true">
                    {flagForFraudReason.length}/{MAX_FRAUD_REASON_LENGTH}
                  </span>
                </p>
              </div>
            </motion.div>
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
