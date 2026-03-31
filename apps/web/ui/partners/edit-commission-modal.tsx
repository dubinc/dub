import { handleMoneyInputChange, handleMoneyKeyDown } from "@/lib/form-utils";
import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import { CommissionResponse } from "@/lib/types";
import { commissionPatchStatusSchema } from "@/lib/zod/schemas/commissions";
import { Button, Modal } from "@dub/ui";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod/v4";
import { CommissionStatusBadges } from "./commission-status-badges";
import { PartnerAvatar } from "./partner-avatar";

type FormData = {
  earnings: number | null;
  status: z.infer<typeof commissionPatchStatusSchema>;
};

interface EditCommissionModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  commission: CommissionResponse;
}

function EditCommissionModal({
  showModal,
  setShowModal,
  commission,
}: EditCommissionModalProps) {
  const { makeRequest, isSubmitting } = useApiMutation();

  const isCustom = commission.type === "custom";

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<FormData>({
    defaultValues: {
      earnings: isCustom ? commission.earnings / 100 : null,
      status: commission.status as FormData["status"],
    },
  });

  useEffect(() => {
    if (showModal) {
      reset({
        earnings: isCustom ? commission.earnings / 100 : null,
        status: commission.status as FormData["status"],
      });
    }
  }, [showModal, commission, reset, isCustom]);

  const onSubmit = async (data: FormData) => {
    const body: Record<string, any> = {};

    if (data.status !== commission.status) {
      body.status = data.status;
    }

    if (isCustom && data.earnings !== null) {
      const earningsInCents = Math.round(data.earnings * 100);
      if (earningsInCents !== commission.earnings) {
        body.earnings = earningsInCents;
      }
    }

    if (Object.keys(body).length === 0) {
      setShowModal(false);
      return;
    }

    await makeRequest(`/api/commissions/${commission.id}`, {
      method: "PATCH",
      body,
      onSuccess: async () => {
        setShowModal(false);
        await mutatePrefix(["/api/commissions", "/api/payouts"]);
        toast.success("Commission updated successfully!");
      },
    });
  };

  const statusOptions = commissionPatchStatusSchema.options;

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="space-y-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">Edit commission</h3>
      </div>

      <div className="bg-neutral-50">
        <form
          onSubmit={(e) => {
            e.stopPropagation();
            return handleSubmit(onSubmit)(e);
          }}
        >
          <div className="flex flex-col gap-4 px-4 py-6 text-left sm:px-6">
            <div className="bg rounded-xl border border-neutral-200 bg-white p-3">
              <div className="flex items-center gap-3">
                <PartnerAvatar
                  partner={commission.partner}
                  className="size-7"
                />
                <h4 className="truncate text-sm font-semibold text-neutral-900">
                  {commission.partner.name}
                </h4>
              </div>
            </div>

            {isCustom && (
              <div>
                <label className="text-content-emphasis text-sm font-normal">
                  Earnings
                </label>
                <div className="relative mt-2 rounded-md shadow-sm">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-neutral-400">
                    $
                  </span>
                  <Controller
                    name="earnings"
                    control={control}
                    rules={{ required: true, min: 0 }}
                    render={({ field }) => (
                      <input
                        type="text"
                        inputMode="decimal"
                        className="block w-full rounded-md border-neutral-300 pl-6 text-neutral-900 placeholder-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                        value={field.value ?? ""}
                        onChange={(e) => {
                          handleMoneyInputChange(e);
                          const val = e.target.value;
                          field.onChange(val === "" ? null : parseFloat(val));
                        }}
                        onKeyDown={handleMoneyKeyDown}
                        placeholder="0.00"
                      />
                    )}
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-content-emphasis text-sm font-normal">
                Status
              </label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <select
                    className="mt-2 block w-full rounded-md border-neutral-300 text-neutral-900 focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                    value={field.value}
                    onChange={field.onChange}
                  >
                    {statusOptions.map((status) => {
                      const badge = CommissionStatusBadges[status];
                      return (
                        <option key={status} value={status}>
                          {badge?.label ?? status}
                        </option>
                      );
                    })}
                  </select>
                )}
              />
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
                disabled={isSubmitting}
              />
              <Button
                type="submit"
                text="Save"
                className="h-8 w-fit rounded-lg"
                loading={isSubmitting}
                disabled={!isDirty}
              />
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export function useEditCommissionModal() {
  const [commission, setCommission] = useState<CommissionResponse | null>(null);

  const openEditCommissionModal = useCallback(
    (commission: CommissionResponse) => {
      setCommission(commission);
    },
    [],
  );

  const closeEditCommissionModal = useCallback(() => {
    setCommission(null);
  }, []);

  const EditCommissionModalCallback = useCallback(() => {
    if (!commission) return null;

    return (
      <EditCommissionModal
        commission={commission}
        showModal
        setShowModal={(show) => {
          if (!show) closeEditCommissionModal();
        }}
      />
    );
  }, [commission, closeEditCommissionModal]);

  return useMemo(
    () => ({
      openEditCommissionModal,
      closeEditCommissionModal,
      EditCommissionModal: EditCommissionModalCallback,
    }),
    [
      openEditCommissionModal,
      closeEditCommissionModal,
      EditCommissionModalCallback,
    ],
  );
}
