"use client";

import { updateReferralStatusAction } from "@/lib/actions/referrals/update-referral-status";
import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { ReferralProps, UpdateReferralStatusPayload } from "@/lib/types";
import { ReferralStatusBadge } from "@/ui/referrals/referral-status-badge";
import { ReferralStatus } from "@dub/prisma/client";
import { AnimatedSizeContainer, Button, Modal, useMediaQuery } from "@dub/ui";
import { cn } from "@dub/utils";
import { ArrowRight, ChevronDown } from "lucide-react";
import { motion } from "motion/react";
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
  buildPayload: (
    base: { referralId: string; workspaceId: string; notes?: string },
    data: StatusChangeFormData,
  ) => UpdateReferralStatusPayload;
};

const STATUS_CONFIG: Record<ReferralStatus, StatusConfig> = {
  pending: {
    fields: [],
    buildPayload: (base) => ({ ...base, status: "pending" }),
  },
  qualified: {
    fields: ["externalId"],
    buildPayload: (base, data) => ({
      ...base,
      status: "qualified",
      externalId: data.externalId || undefined,
    }),
  },
  meeting: {
    fields: [],
    buildPayload: (base) => ({ ...base, status: "meeting" }),
  },
  negotiation: {
    fields: [],
    buildPayload: (base) => ({ ...base, status: "negotiation" }),
  },
  unqualified: {
    fields: [],
    buildPayload: (base) => ({ ...base, status: "unqualified" }),
  },
  closedWon: {
    fields: ["saleAmount", "stripeCustomerId"],
    buildPayload: (base, data) => ({
      ...base,
      status: "closedWon",
      saleAmount: Math.round((data.saleAmount ?? 0) * 100),
      stripeCustomerId: data.stripeCustomerId || undefined,
    }),
  },
  closedLost: {
    fields: [],
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
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const { executeAsync, isPending } = useAction(updateReferralStatusAction, {
    onSuccess: async () => {
      setShowModal(false);
      toast.success("Referral status updated successfully!");
      await mutatePrefix([
        `/api/programs/${defaultProgramId}/referrals`,
        "/api/activity-logs",
      ]);
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
      setShowAdvancedOptions(false);
    }
  }, [showModal, newStatus, reset]);

  const config = STATUS_CONFIG[newStatus];
  const visibleFields = new Set(config.fields);
  const hasAdvancedSettings = visibleFields.has("stripeCustomerId");

  const onSubmit = async (data: StatusChangeFormData) => {
    if (!workspaceId || !referral.id) return;

    const payload = config.buildPayload(
      {
        workspaceId,
        referralId: referral.id,
        notes: data.notes || undefined,
      },
      data,
    );

    await executeAsync(payload);
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
                className="pointer-events-none absolute inset-0 bg-neutral-50"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, #d4d4d4 1px, transparent 1px)",
                  backgroundSize: "16px 16px",
                }}
              />
              <div className="relative flex items-center justify-center gap-4">
                <ReferralStatusBadge status={referral.status} className="h-7" />
                <ArrowRight className="size-4 text-neutral-400" />
                <ReferralStatusBadge status={newStatus} className="h-7" />
              </div>
            </div>

            {visibleFields.has("externalId") && (
              <div>
                <label className="text-content-emphasis text-sm font-medium">
                  External ID (optional)
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  className={cn(
                    "border-border-subtle mt-2 block w-full rounded-lg text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                    errors.externalId &&
                      "border-red-600 focus:border-red-500 focus:ring-red-600",
                  )}
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
                <label className="text-content-emphasis text-sm font-medium">
                  Sale Amount
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
                      "border-border-subtle block w-full rounded-lg pl-6 pr-12 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                      errors.saleAmount &&
                        "border-red-600 focus:border-red-500 focus:ring-red-600",
                    )}
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

            <div>
              <label className="text-content-emphasis text-sm font-medium">
                Notes for the partner (optional)
              </label>
              <textarea
                rows={2}
                className={cn(
                  "border-border-subtle mt-2 block w-full rounded-lg text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                  errors.notes &&
                    "border-red-600 focus:border-red-500 focus:ring-red-600",
                )}
                {...register("notes", {
                  setValueAs: (value) => (value === "" ? undefined : value),
                })}
              />
            </div>

            {hasAdvancedSettings && (
              <div className="flex flex-col">
                <button
                  type="button"
                  className="flex w-full items-center gap-2"
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                >
                  <p className="text-sm text-neutral-700">
                    {showAdvancedOptions ? "Hide" : "Show"} advanced settings
                  </p>
                  <motion.div
                    animate={{ rotate: showAdvancedOptions ? 180 : 0 }}
                    className="text-neutral-600"
                  >
                    <ChevronDown className="size-4" />
                  </motion.div>
                </button>

                <AnimatedSizeContainer height className="flex flex-col">
                  {showAdvancedOptions &&
                    visibleFields.has("stripeCustomerId") && (
                      <div className="mt-4 p-px">
                        <div>
                          <label className="text-content-emphasis text-sm font-medium">
                            Stripe Customer ID (optional)
                          </label>
                          <input
                            type="text"
                            autoComplete="off"
                            className={cn(
                              "border-border-subtle mt-2 block w-full rounded-lg text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm",
                              errors.stripeCustomerId &&
                                "border-red-600 focus:border-red-500 focus:ring-red-600",
                            )}
                            {...register("stripeCustomerId", {
                              setValueAs: (value) =>
                                value === "" ? undefined : value,
                            })}
                          />
                          <p className="text-content-subtle mt-1 text-xs">
                            The customer's Stripe Customer ID
                          </p>
                        </div>
                      </div>
                    )}
                </AnimatedSizeContainer>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end border-t border-neutral-200 px-4 py-4 sm:px-6">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                text="Cancel"
                className="h-8 w-fit"
                onClick={() => setShowModal(false)}
                disabled={isSubmitting}
              />
              <Button
                type="submit"
                text="Confirm"
                className="h-8 w-fit"
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
    referral: Pick<ReferralProps, "id" | "status">;
    newStatus: ReferralStatus;
  } | null>(null);

  function openConfirmReferralStatusChangeModal(
    referral: Pick<ReferralProps, "id" | "status">,
    newStatus: ReferralStatus,
  ) {
    setState({ referral, newStatus });
  }

  function closeConfirmReferralStatusChangeModal() {
    setState(null);
    options?.onClose?.();
  }

  return {
    openConfirmReferralStatusChangeModal,
    closeConfirmReferralStatusChangeModal,
    ConfirmReferralStatusChangeModal: state ? (
      <ConfirmReferralStatusChangeModal
        referral={state.referral}
        newStatus={state.newStatus}
        showModal
        setShowModal={(show) => {
          if (!show) closeConfirmReferralStatusChangeModal();
        }}
      />
    ) : null,
    isConfirmReferralStatusChangeModalOpen: state !== null,
  };
}
