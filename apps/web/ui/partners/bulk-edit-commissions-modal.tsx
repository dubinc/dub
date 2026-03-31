import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import { CommissionResponse } from "@/lib/types";
import { commissionPatchStatusSchema } from "@/lib/zod/schemas/commissions";
import { Button, Modal } from "@dub/ui";
import { InvoiceDollar } from "@dub/ui/icons";
import { pluralize } from "@dub/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { CommissionStatusBadges } from "./commission-status-badges";
import { PartnerAvatar } from "./partner-avatar";

type FormData = {
  status: string;
};

interface BulkEditCommissionsModalProps {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  commissions: CommissionResponse[];
}

function BulkEditCommissionsModal({
  showModal,
  setShowModal,
  commissions,
}: BulkEditCommissionsModalProps) {
  const { makeRequest, isSubmitting } = useApiMutation();

  // Check if all commissions are from the same partner
  const singlePartner = useMemo(() => {
    if (commissions.length === 0) return null;

    const firstPartnerId = commissions[0].partner.id;
    const allSamePartner = commissions.every(
      (c) => c.partner.id === firstPartnerId,
    );

    return allSamePartner ? commissions[0].partner : null;
  }, [commissions]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<FormData>({
    defaultValues: {
      status: commissions[0]?.status ?? "pending",
    },
  });

  useEffect(() => {
    if (showModal) {
      reset({
        status: commissions[0]?.status ?? "pending",
      });
    }
  }, [showModal, commissions, reset]);

  const onSubmit = async (data: FormData) => {
    await makeRequest("/api/commissions/bulk", {
      method: "PATCH",
      body: {
        commissionIds: commissions.map((c) => c.id),
        status: data.status,
      },
      onSuccess: async () => {
        setShowModal(false);
        await mutatePrefix(["/api/commissions", "/api/payouts"]);
        toast.success(
          `${commissions.length} ${pluralize("commission", commissions.length)} updated successfully!`,
        );
      },
    });
  };

  const statusOptions = commissionPatchStatusSchema.options;

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
          <div className="flex flex-col gap-4 px-4 py-6 text-left sm:px-6">
            <div className="bg rounded-xl border border-neutral-200 bg-white">
              <div className="divide-y divide-neutral-200">
                {singlePartner && (
                  <div className="flex items-center gap-3 p-3">
                    <PartnerAvatar partner={singlePartner} className="size-7" />
                    <h4 className="truncate text-sm font-semibold text-neutral-900">
                      {singlePartner.name}
                    </h4>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3">
                  <div className="flex size-7 items-center justify-center rounded-full border border-neutral-200 bg-neutral-100">
                    <InvoiceDollar className="text-content-default size-4" />
                  </div>
                  <span className="text-sm font-semibold text-neutral-900">
                    {commissions.length}{" "}
                    {pluralize("commission", commissions.length)} selected
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

export function useBulkEditCommissionsModal() {
  const [commissions, setCommissions] = useState<CommissionResponse[]>([]);
  const [showModal, setShowModal] = useState(false);

  const openBulkEditCommissionsModal = useCallback(
    (commissions: CommissionResponse[]) => {
      setCommissions(commissions);
      setShowModal(true);
    },
    [],
  );

  const BulkEditCommissionsModalCallback = useCallback(() => {
    if (!showModal || commissions.length === 0) return null;

    return (
      <BulkEditCommissionsModal
        commissions={commissions}
        showModal={showModal}
        setShowModal={setShowModal}
      />
    );
  }, [showModal, commissions]);

  return useMemo(
    () => ({
      openBulkEditCommissionsModal,
      BulkEditCommissionsModal: BulkEditCommissionsModalCallback,
    }),
    [openBulkEditCommissionsModal, BulkEditCommissionsModalCallback],
  );
}
