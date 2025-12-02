import { bulkResolveFraudGroupsAction } from "@/lib/actions/fraud/bulk-resolve-fraud-groups";
import useWorkspace from "@/lib/swr/use-workspace";
import { fraudEventGroupProps } from "@/lib/types";
import {
  bulkResolveFraudGroupsSchema,
  MAX_RESOLUTION_REASON_LENGTH,
} from "@/lib/zod/schemas/fraud";
import { MaxCharactersCounter } from "@/ui/shared/max-characters-counter";
import { Button, Modal } from "@dub/ui";
import { cn, pluralize } from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

type BulkResolveFraudGroupsFormData = z.infer<
  typeof bulkResolveFraudGroupsSchema
> & {
  confirm: string;
};

interface BulkResolveFraudGroupsProps {
  showBulkResolveFraudGroupsModal: boolean;
  setShowBulkResolveFraudGroupsModal: Dispatch<SetStateAction<boolean>>;
  fraudEventGroups: fraudEventGroupProps[];
  onConfirm?: () => Promise<void>;
}

function BulkResolveFraudGroupsModal({
  showBulkResolveFraudGroupsModal,
  setShowBulkResolveFraudGroupsModal,
  fraudEventGroups,
  onConfirm,
}: BulkResolveFraudGroupsProps) {
  const { id: workspaceId } = useWorkspace();

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors, isSubmitting, isSubmitSuccessful },
  } = useForm<BulkResolveFraudGroupsFormData>({
    defaultValues: {
      resolutionReason: null,
      confirm: "",
    },
  });

  const [confirm] = watch(["confirm"]);

  const { executeAsync, isPending } = useAction(bulkResolveFraudGroupsAction, {
    onSuccess: async () => {
      await onConfirm?.();
      toast.success("Fraud events resolved successfully!");
      setShowBulkResolveFraudGroupsModal(false);
    },
    onError({ error }) {
      toast.error(error.serverError);
    },
  });

  const onSubmit = useCallback(
    async (data: BulkResolveFraudGroupsFormData) => {
      if (!workspaceId || fraudEventGroups.length === 0) {
        return;
      }

      await executeAsync({
        ...data,
        workspaceId,
        groupIds: fraudEventGroups.map((g) => g.id),
      });
    },
    [executeAsync, fraudEventGroups, workspaceId],
  );

  const totalEventCount = fraudEventGroups.reduce(
    (sum, group) => sum + (group.eventCount ?? 1),
    0,
  );
  const eventWord = pluralize("event", totalEventCount);
  const confirmationText = `confirm resolve ${eventWord}`;

  const isDisabled = useMemo(() => {
    return (
      !workspaceId ||
      fraudEventGroups.length === 0 ||
      confirm !== confirmationText
    );
  }, [workspaceId, fraudEventGroups.length, confirm, confirmationText]);

  return (
    <Modal
      showModal={showBulkResolveFraudGroupsModal}
      setShowModal={setShowBulkResolveFraudGroupsModal}
    >
      <div className="border-b border-neutral-200 p-4 sm:p-6">
        <h3 className="text-lg font-medium leading-none">
          Resolve {eventWord}
        </h3>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6 bg-neutral-50 p-4 sm:p-6">
          <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-3">
            <div className="flex items-center gap-3">
              <span className="text-base font-semibold text-neutral-900">
                {totalEventCount} {eventWord} selected
              </span>
            </div>
          </div>

          <p className="text-sm text-neutral-600">
            This will mark the selected fraud {eventWord} as resolved. You can
            add optional notes about why these events are being resolved.
          </p>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="resolutionReason"
                className="block text-sm font-medium text-neutral-900"
              >
                Internal notes (optional)
              </label>
              <MaxCharactersCounter
                name="resolutionReason"
                maxLength={MAX_RESOLUTION_REASON_LENGTH}
                control={control}
              />
            </div>
            <div className="relative mt-1.5 rounded-md shadow-sm">
              <textarea
                id="resolutionReason"
                className={cn(
                  "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.resolutionReason && "border-red-600",
                )}
                placeholder="Add notes about why events are resolved..."
                rows={3}
                maxLength={MAX_RESOLUTION_REASON_LENGTH}
                {...register("resolutionReason")}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-900">
              To verify, type <strong>{confirmationText}</strong> below
            </label>
            <div className="relative mt-1.5 rounded-md shadow-sm">
              <input
                className={cn(
                  "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.confirm && "border-red-600",
                )}
                placeholder={confirmationText}
                type="text"
                autoComplete="off"
                {...register("confirm", {
                  required: true,
                })}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 bg-neutral-50 px-4 pb-5 sm:px-6">
          <Button
            onClick={() => setShowBulkResolveFraudGroupsModal(false)}
            variant="secondary"
            text="Cancel"
            className="h-8 w-fit px-3"
          />
          <Button
            type="submit"
            variant="primary"
            text={`Resolve ${totalEventCount} ${eventWord}`}
            disabled={isDisabled}
            loading={isPending || isSubmitting || isSubmitSuccessful}
            className="h-8 w-fit px-3"
          />
        </div>
      </form>
    </Modal>
  );
}

export function useBulkResolveFraudGroupsModal({
  fraudEventGroups,
  onConfirm,
}: {
  fraudEventGroups: fraudEventGroupProps[];
  onConfirm?: () => Promise<void>;
}) {
  const [showBulkResolveFraudGroupsModal, setShowBulkResolveFraudGroupsModal] =
    useState(false);

  const BulkResolveFraudGroupsModalCallback = useCallback(() => {
    return (
      <BulkResolveFraudGroupsModal
        showBulkResolveFraudGroupsModal={showBulkResolveFraudGroupsModal}
        setShowBulkResolveFraudGroupsModal={setShowBulkResolveFraudGroupsModal}
        fraudEventGroups={fraudEventGroups}
        onConfirm={onConfirm}
      />
    );
  }, [
    showBulkResolveFraudGroupsModal,
    setShowBulkResolveFraudGroupsModal,
    fraudEventGroups,
    onConfirm,
  ]);

  return useMemo(
    () => ({
      setShowBulkResolveFraudGroupsModal,
      BulkResolveFraudGroupsModal: BulkResolveFraudGroupsModalCallback,
    }),
    [setShowBulkResolveFraudGroupsModal, BulkResolveFraudGroupsModalCallback],
  );
}
