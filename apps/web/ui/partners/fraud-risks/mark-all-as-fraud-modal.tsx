"use client";

import { resolveFraudGroupAction } from "@/lib/actions/fraud/resolve-fraud-group";
import { parseActionError } from "@/lib/actions/parse-action-errors";
import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { CommissionResponse, FraudGroupProps } from "@/lib/types";
import { commissionPatchStatusSchema } from "@/lib/zod/schemas/commissions";
import { MAX_RESOLUTION_REASON_LENGTH } from "@/lib/zod/schemas/fraud";
import { PartnerAvatar } from "@/ui/partners/partner-avatar";
import { useCommissionStatusCombobox } from "@/ui/partners/use-commission-status-combobox";
import { MaxCharactersCounter } from "@/ui/shared/max-characters-counter";
import { Button, Combobox, Modal, Switch } from "@dub/ui";
import { InvoiceDollar } from "@dub/ui/icons";
import { cn, fetcher, pluralize } from "@dub/utils";
import { motion } from "motion/react";
import { useAction } from "next-safe-action/hooks";
import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import useSWR from "swr";
import * as z from "zod/v4";

type FormData = {
  status: z.infer<typeof commissionPatchStatusSchema>;
  resolutionReason: string;
};

// TODO: Consolidate with bulk-edit-commissions-modal

function MarkAllAsFraudModal({
  showModal,
  setShowModal,
  fraudGroup,
  onSuccess,
  onResolve,
}: {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  fraudGroup: FraudGroupProps;
  onSuccess?: () => Promise<void>; // Called when the commissions are marked as fraud
  onResolve?: () => Promise<void>; // Called when the fraud event is resolved
}) {
  const { id: workspaceId } = useWorkspace();
  const { makeRequest, isSubmitting } = useApiMutation();
  const [resolveFraudEvent, setResolveFraudEvent] = useState(false);

  const { partner } = fraudGroup;

  const { register, handleSubmit, control, reset, watch } = useForm<FormData>({
    defaultValues: {
      status: "fraud",
      resolutionReason: "",
    },
  });

  const { data: commissions, isLoading } = useSWR<CommissionResponse[]>(
    workspaceId
      ? `/api/commissions?${new URLSearchParams({
          workspaceId,
          status: "pending",
          fraudEventGroupId: fraudGroup.id,
          pageSize: "100",
        }).toString()}`
      : null,
    fetcher,
  );

  const { executeAsync: resolveGroup, isPending: isResolving } = useAction(
    resolveFraudGroupAction,
    {
      onError: ({ error }) => {
        toast.error(parseActionError(error, "Failed to resolve fraud events."));
      },
    },
  );

  useEffect(() => {
    if (showModal) {
      reset({
        status: "fraud",
        resolutionReason: "",
      });
      setResolveFraudEvent(false);
    }
  }, [showModal, reset]);

  const isSaving = isSubmitting || isResolving;
  const selectedStatus = watch("status");
  const commissionIds = (commissions ?? []).map((c) => c.id);

  const { statusComboboxOptions, selectedStatusOption } =
    useCommissionStatusCombobox(selectedStatus);

  const onSubmit = async (data: FormData) => {
    if (!workspaceId) return;

    let bulkUpdateSucceeded = false;

    await Promise.all([
      makeRequest("/api/commissions/bulk", {
        method: "PATCH",
        body: {
          commissionIds,
          status: data.status,
        },
        onSuccess: () => {
          bulkUpdateSucceeded = true;
        },
      }),

      ...(resolveFraudEvent
        ? [
            resolveGroup({
              workspaceId,
              groupId: fraudGroup.id,
              resolutionReason: data.resolutionReason || null,
            }),
          ]
        : []),
    ]);

    if (bulkUpdateSucceeded) {
      setShowModal(false);
      reset();
      setResolveFraudEvent(false);
      await mutatePrefix(["/api/commissions", "/api/fraud/groups"]);

      if (resolveFraudEvent) {
        await onResolve?.();
      } else {
        await onSuccess?.();
      }

      toast.success(
        `${commissionIds.length} ${pluralize("commission", commissionIds.length)} updated successfully!`,
      );
    }
  };

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">Edit commissions</h3>
      </div>

      <div className="bg-neutral-50">
        <form
          onSubmit={(e) => {
            e.stopPropagation();
            return handleSubmit(onSubmit)(e);
          }}
        >
          <div className="flex flex-col gap-6 px-4 py-6 text-left sm:px-6">
            <div className="rounded-xl border border-neutral-200 bg-white">
              <div className="divide-y divide-neutral-200">
                <div className="flex items-center gap-3 p-3">
                  <PartnerAvatar partner={partner} className="size-7" />
                  <h4 className="truncate text-sm font-semibold text-neutral-900">
                    {partner.name}
                  </h4>
                </div>
                <div className="flex items-center gap-3 p-3">
                  <div className="flex size-7 items-center justify-center rounded-full border border-neutral-200 bg-neutral-100">
                    <InvoiceDollar className="text-content-default size-4" />
                  </div>
                  <span className="text-sm font-semibold text-neutral-900">
                    {commissionIds.length}{" "}
                    {pluralize("commission", commissionIds.length)} selected
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="text-content-emphasis text-sm font-normal">
                Status
              </label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <div className="mt-2">
                    <Combobox
                      options={statusComboboxOptions}
                      selected={selectedStatusOption ?? null}
                      setSelected={(option) => {
                        if (!option) return;
                        field.onChange(option.value);
                      }}
                      placeholder="Select status"
                      searchPlaceholder="Search status..."
                      caret
                      matchTriggerWidth
                      buttonProps={{
                        className:
                          "w-full justify-start border-neutral-300 px-3 data-[state=open]:ring-1 data-[state=open]:ring-neutral-500 data-[state=open]:border-neutral-500 focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 transition-none",
                      }}
                    >
                      {selectedStatusOption ? (
                        <span className="flex items-center gap-2">
                          {selectedStatusOption.icon}
                          <span>{selectedStatusOption.label}</span>
                        </span>
                      ) : (
                        "Select status"
                      )}
                    </Combobox>
                  </div>
                )}
              />
            </div>

            <div>
              <div className="flex items-center gap-3">
                <Switch checked={resolveFraudEvent} fn={setResolveFraudEvent} />
                <label className="text-sm font-medium text-neutral-900">
                  Resolve fraud event
                </label>
              </div>

              <motion.div
                animate={{ height: resolveFraudEvent ? "auto" : 0 }}
                transition={{ duration: 0.1 }}
                initial={false}
                className="overflow-hidden"
                inert={!resolveFraudEvent}
              >
                <div className="pt-6">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="resolutionReason"
                      className="text-sm font-medium text-neutral-900"
                    >
                      Internal notes (optional)
                    </label>
                    <MaxCharactersCounter
                      name="resolutionReason"
                      maxLength={MAX_RESOLUTION_REASON_LENGTH}
                      control={control}
                    />
                  </div>
                  <div className="relative mt-1.5 rounded-md p-px shadow-sm">
                    <textarea
                      id="resolutionReason"
                      className={cn(
                        "block w-full rounded-md border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                      )}
                      placeholder="Add notes about why events are resolved..."
                      rows={3}
                      maxLength={MAX_RESOLUTION_REASON_LENGTH}
                      {...register("resolutionReason")}
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-neutral-200 px-4 py-4 sm:px-6">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                text="Cancel"
                className="h-8 w-fit rounded-lg"
                onClick={() => setShowModal(false)}
                disabled={isSaving}
              />
              <Button
                type="submit"
                text={resolveFraudEvent ? "Save and resolve" : "Save"}
                className="h-8 w-fit rounded-lg"
                loading={isSaving}
                disabled={isLoading}
              />
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export function useMarkAllAsFraudModal({
  fraudGroup,
  onSuccess,
  onResolve,
}: {
  fraudGroup: FraudGroupProps;
  onSuccess?: () => Promise<void>;
  onResolve?: () => Promise<void>;
}) {
  const [showMarkAllAsFraudModal, setShowMarkAllAsFraudModal] = useState(false);

  const MarkAllAsFraudModalComponent = useMemo(
    () => (
      <MarkAllAsFraudModal
        showModal={showMarkAllAsFraudModal}
        setShowModal={setShowMarkAllAsFraudModal}
        fraudGroup={fraudGroup}
        onSuccess={onSuccess}
        onResolve={onResolve}
      />
    ),
    [
      showMarkAllAsFraudModal,
      setShowMarkAllAsFraudModal,
      fraudGroup,
      onSuccess,
      onResolve,
    ],
  );

  return useMemo(
    () => ({
      setShowMarkAllAsFraudModal,
      MarkAllAsFraudModal: MarkAllAsFraudModalComponent,
    }),
    [setShowMarkAllAsFraudModal, MarkAllAsFraudModalComponent],
  );
}
