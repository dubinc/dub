"use client";

import { updateReferralStatusAction } from "@/lib/actions/referrals/update-referral-status";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  ReferralProps,
  UpdateReferralStatusFormSchema,
  UpdateReferralStatusPayload,
} from "@/lib/types";
import {
  markReferralClosedLostSchema,
  markReferralClosedWonSchema,
  markReferralQualifiedSchema,
  markReferralUnqualifiedSchema,
} from "@/lib/zod/schemas/referrals";
import { ReferralStatusBadge } from "@/ui/referrals/referral-status-badge";
import { ReferralStatus } from "@dub/prisma/client";
import { Button, Modal, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { ArrowRight } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type StatusField = "notes" | "externalId" | "saleAmount" | "stripeCustomerId";

type StatusChangeFormData = {
  notes: string;
  externalId: string;
  saleAmount: number | null;
  stripeCustomerId: string;
};

type StatusConfig = {
  fields: StatusField[];
  formSchema: UpdateReferralStatusFormSchema;
  buildPayload: (
    base: { referralId: string; workspaceId: string; notes?: string },
    data: StatusChangeFormData,
  ) => UpdateReferralStatusPayload;
};

const STATUS_CONFIG: Record<ReferralStatus, StatusConfig> = {
  pending: {
    fields: [],
    formSchema: markReferralClosedLostSchema,
    buildPayload: (base) => ({ ...base, status: "pending" }),
  },
  qualified: {
    fields: ["externalId"],
    formSchema: markReferralQualifiedSchema,
    buildPayload: (base, data) => ({
      ...base,
      status: "qualified",
      externalId: data.externalId || undefined,
    }),
  },
  unqualified: {
    fields: [],
    formSchema: markReferralUnqualifiedSchema,
    buildPayload: (base) => ({ ...base, status: "unqualified" }),
  },
  closedWon: {
    fields: ["saleAmount", "stripeCustomerId"],
    formSchema: markReferralClosedWonSchema,
    buildPayload: (base, data) => ({
      ...base,
      status: "closedWon",
      saleAmount: Math.round((data.saleAmount ?? 0) * 100),
      stripeCustomerId: data.stripeCustomerId || undefined,
    }),
  },
  closedLost: {
    fields: [],
    formSchema: markReferralClosedLostSchema,
    buildPayload: (base) => ({ ...base, status: "closedLost" }),
  },
};

type ConfirmReferralStatusChangeModalProps = {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  referral: Pick<ReferralProps, "id" | "status">;
  newStatus: ReferralStatus;
};

function ConfirmReferralStatusChangeModal({
  showModal,
  setShowModal,
  referral,
  newStatus,
}: ConfirmReferralStatusChangeModalProps) {
  const { isMobile } = useMediaQuery();
  const { id: workspaceId, defaultProgramId } = useWorkspace();

  const { executeAsync, isPending } = useAction(updateReferralStatusAction, {
    onSuccess: async () => {
      await mutatePrefix(`/api/programs/${defaultProgramId}/referrals`);
      toast.success("Referral status updated successfully!");
    },
    onError({ error }) {
      toast.error(error.serverError || "Failed to update referral status");
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StatusChangeFormData>({
    defaultValues: {
      notes: "",
      externalId: "",
      saleAmount: null,
      stripeCustomerId: "",
    },
  });

  useEffect(() => {
    if (showModal) {
      reset({
        notes: "",
        externalId: "",
        saleAmount: null,
        stripeCustomerId: "",
      });
    }
  }, [showModal, newStatus, reset]);

  const config = STATUS_CONFIG[newStatus];
  const visibleFields = new Set(config.fields);

  const onSubmit = async (data: StatusChangeFormData) => {
    if (!workspaceId || !referral.id) return;

    const payload = config.buildPayload(
      {
        referralId: referral.id,
        workspaceId,
        notes: data.notes || undefined,
      },
      data,
    );

    await executeAsync(payload);
    setShowModal(false);
  };

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-content-emphasis text-lg font-medium">
          Confirm stage change
        </h3>
      </div>

      <div>
        <form
          onSubmit={(e) => {
            e.stopPropagation();
            return handleSubmit(onSubmit)(e);
          }}
        >
          <div className="flex flex-col gap-4 px-4 py-6 text-left sm:px-6">
            <div className="relative overflow-hidden rounded-lg border border-neutral-200 bg-white p-5">
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, #d4d4d4 1px, transparent 1px)",
                  backgroundSize: "16px 16px",
                }}
              />
              <div className="relative flex items-center justify-center gap-4">
                <ReferralStatusBadge status={referral.status} />
                <ArrowRight className="size-4 text-neutral-400" />
                <ReferralStatusBadge status={newStatus} />
              </div>
            </div>

            {visibleFields.has("externalId") && (
              <div>
                <label className="text-content-emphasis text-sm font-normal">
                  External ID (optional)
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  className={cn(
                    "border-border-subtle mt-2 block w-full rounded-lg text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                    errors.externalId &&
                      "border-red-600 focus:border-red-500 focus:ring-red-600",
                  )}
                  placeholder="External customer ID"
                  autoFocus={!isMobile}
                  {...register("externalId", {
                    setValueAs: (value) => (value === "" ? undefined : value),
                  })}
                />
                <p className="text-content-subtle mt-1 text-xs">
                  The customer's external ID. If not provided, the referral
                  email will be used.
                </p>
              </div>
            )}

            {visibleFields.has("saleAmount") && (
              <div>
                <label className="text-content-emphasis text-sm font-normal">
                  Sale Amount (required)
                </label>
                <div className="relative mt-2">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-400">
                    $
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className={cn(
                      "border-border-subtle block w-full rounded-lg pl-6 pr-12 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                      errors.saleAmount &&
                        "border-red-600 focus:border-red-500 focus:ring-red-600",
                    )}
                    placeholder="50000"
                    {...register("saleAmount", {
                      required: "Sale amount is required",
                      min: {
                        value: 0,
                        message:
                          "Sale amount must be greater than or equal to 0",
                      },
                      valueAsNumber: true,
                      onChange: handleMoneyInputChange,
                    })}
                    onKeyDown={handleMoneyKeyDown}
                  />
                  <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-neutral-400">
                    USD
                  </span>
                </div>
                {errors.saleAmount ? (
                  <p className="text-xs text-red-600">
                    {errors.saleAmount.message}
                  </p>
                ) : (
                  <p className="text-content-subtle mt-1 text-xs">
                    This will also be recorded as a sale commission (if
                    applicable)
                  </p>
                )}
              </div>
            )}

            {visibleFields.has("stripeCustomerId") && (
              <div>
                <label className="text-content-emphasis text-sm font-normal">
                  Stripe Customer ID (optional)
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  className={cn(
                    "border-border-subtle mt-2 block w-full rounded-lg text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                    errors.stripeCustomerId &&
                      "border-red-600 focus:border-red-500 focus:ring-red-600",
                  )}
                  placeholder="cus_NffrFeUfNV2Hib"
                  {...register("stripeCustomerId", {
                    setValueAs: (value) => (value === "" ? undefined : value),
                  })}
                />
                <p className="text-content-subtle mt-1 text-xs">
                  The customer's Stripe Customer ID
                </p>
              </div>
            )}

            <div>
              <label className="text-content-emphasis text-sm font-normal">
                Notes for the partner (optional)
              </label>
              <textarea
                rows={4}
                className={cn(
                  "border-border-subtle mt-2 block w-full rounded-lg text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.notes &&
                    "border-red-600 focus:border-red-500 focus:ring-red-600",
                )}
                placeholder="Add a note for the partner..."
                {...register("notes", {
                  setValueAs: (value) => (value === "" ? undefined : value),
                })}
              />
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-neutral-200 px-4 py-4 sm:px-6">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                text="Cancel"
                className="h-9 w-fit"
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
              />
              <Button
                type="submit"
                text="Confirm"
                className="h-9 w-fit"
                loading={isPending || isSubmitting}
              />
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export function useConfirmReferralStatusChangeModal(options?: {
  onClose?: () => void;
}) {
  const [state, setState] = useState<{
    referral: ReferralProps;
    newStatus: ReferralStatus;
  } | null>(null);

  function openConfirmReferralStatusChangeModal(
    referral: ReferralProps,
    newStatus: ReferralStatus,
  ) {
    setState({ referral, newStatus });
  }

  function closeConfirmReferralStatusChangeModal() {
    setState(null);
    options?.onClose?.();
  }

  function ConfirmReferralStatusChangeModalWrapper() {
    if (!state) return null;

    return (
      <ConfirmReferralStatusChangeModal
        referral={state.referral}
        newStatus={state.newStatus}
        showModal
        setShowModal={(show) => {
          if (!show) closeConfirmReferralStatusChangeModal();
        }}
      />
    );
  }

  return {
    openConfirmReferralStatusChangeModal,
    closeConfirmReferralStatusChangeModal,
    ConfirmReferralStatusChangeModal: ConfirmReferralStatusChangeModalWrapper,
    isConfirmReferralStatusChangeModalOpen: state !== null,
  };
}
