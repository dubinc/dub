"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { CommissionsCount, CustomerEnriched, CustomerProps } from "@/lib/types";
import { PartnerLinkSelector } from "@/ui/partners/partner-link-selector";
import { PartnerSelector } from "@/ui/partners/partner-selector";
import { Button, Checkbox, Modal } from "@dub/ui";
import { currencyFormatter, fetcher } from "@dub/utils";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import useSWR from "swr";

type FormData = {
  partnerId: string | null;
  linkId: string | null;
  createClawback: boolean;
};

type ReattributeCustomerModalProps = {
  showModal: boolean;
  setShowModal: (showModal: boolean) => void;
  customer: Pick<CustomerEnriched, "id" | "partner" | "link">;
  onSuccess?: (customer: CustomerProps) => void;
};

function ReattributeCustomerModal({
  showModal,
  setShowModal,
  customer,
  onSuccess,
}: ReattributeCustomerModalProps) {
  const { id: workspaceId } = useWorkspace();
  const { makeRequest, isSubmitting } = useApiMutation<CustomerProps>();

  const {
    watch,
    setValue,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<FormData>({
    defaultValues: {
      partnerId: customer.partner?.id ?? null,
      linkId: customer.link?.id ?? null,
      createClawback: false,
    },
  });

  const [partnerId, linkId, createClawback] = watch([
    "partnerId",
    "linkId",
    "createClawback",
  ]);

  useEffect(() => {
    if (showModal) {
      reset({
        partnerId: customer.partner?.id ?? null,
        linkId: customer.link?.id ?? null,
        createClawback: false,
      });
    }
  }, [showModal, customer, reset]);

  const {
    data: commissionsCount,
    error: commissionsCountError,
    mutate: retryCommissionsCount,
    isValidating: isCommissionsCountValidating,
  } = useSWR<CommissionsCount>(
    workspaceId && customer.id && showModal
      ? `/api/commissions/count?${new URLSearchParams({
          customerId: customer.id,
          workspaceId,
          interval: "all",
        })}`
      : null,
    fetcher,
  );

  const paidEarnings = commissionsCount?.paid?.earnings ?? 0;
  const showClawback = !commissionsCountError && paidEarnings > 0;
  const isUnchanged =
    partnerId === (customer.partner?.id ?? null) &&
    linkId === (customer.link?.id ?? null);

  const onSubmit = async (data: FormData) => {
    if (!data.partnerId || !data.linkId) {
      return;
    }

    await makeRequest(`/api/customers/${customer.id}/reattribute`, {
      method: "POST",
      body: {
        partnerId: data.partnerId,
        linkId: data.linkId,
        createClawback: data.createClawback,
      },
      onSuccess: async (updatedCustomer) => {
        toast.success("Customer reattributed. Analytics will update shortly.");
        setShowModal(false);
        await Promise.all([
          mutatePrefix("/api/customers"),
          mutatePrefix("/api/commissions"),
        ]);
        onSuccess?.(updatedCustomer);
      },
    });
  };

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="sm:max-w-md"
    >
      <form
        className="px-5 py-4"
        onSubmit={(e) => {
          e.stopPropagation();
          handleSubmit(onSubmit)(e);
        }}
      >
        <h3 className="text-lg font-medium">Assign to partner</h3>
        <p className="mt-1 text-sm text-neutral-500">
          Move this customer to a different partner. Unpaid commissions will
          transfer automatically.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <span className="block text-sm font-medium text-neutral-900">
            Partner
          </span>
          <PartnerSelector
            selectedPartnerId={partnerId}
            setSelectedPartnerId={(id) => {
              setValue("partnerId", id, { shouldDirty: true });
              setValue("linkId", null, { shouldDirty: true });
            }}
          />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <span className="block text-sm font-medium text-neutral-900">
            Referral link
          </span>
          <PartnerLinkSelector
            selectedLinkId={linkId}
            partnerId={partnerId}
            showDestinationUrl={false}
            setSelectedLinkId={(id) =>
              setValue("linkId", id, { shouldDirty: true })
            }
            disabledTooltip={
              !partnerId
                ? "You need to select a partner first before you can select a link"
                : undefined
            }
          />
        </div>

        {commissionsCountError && (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-sm text-neutral-700">
              Failed to load paid commissions. Retry before saving.
            </p>
            <Button
              type="button"
              variant="secondary"
              text="Retry"
              className="h-8 w-fit shrink-0"
              loading={isCommissionsCountValidating}
              onClick={() => retryCommissionsCount()}
            />
          </div>
        )}

        {showClawback && (
          <label className="mt-5 flex items-start gap-2.5 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <Checkbox
              checked={createClawback}
              onCheckedChange={(checked) =>
                setValue("createClawback", checked === true, {
                  shouldDirty: true,
                })
              }
              className="mt-0.5"
            />
            <span className="text-sm text-neutral-700">
              Create a clawback for{" "}
              <span className="font-medium text-neutral-900">
                {currencyFormatter(paidEarnings)}
              </span>{" "}
              already paid to the previous partner.
            </span>
          </label>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
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
            variant="primary"
            text="Save"
            className="h-9 w-fit"
            loading={isSubmitting}
            disabled={
              !isDirty ||
              isUnchanged ||
              !partnerId ||
              !linkId ||
              Boolean(commissionsCountError)
            }
          />
        </div>
      </form>
    </Modal>
  );
}

export function useReattributeCustomerModal() {
  const [customer, setCustomer] = useState<CustomerEnriched | null>(null);
  const [onSuccess, setOnSuccess] = useState<
    ((customer: CustomerProps) => void) | undefined
  >();

  const openReattributeCustomerModal = useCallback(
    (
      nextCustomer: CustomerEnriched,
      options?: { onSuccess?: (customer: CustomerProps) => void },
    ) => {
      setCustomer(nextCustomer);
      setOnSuccess(() => options?.onSuccess);
    },
    [],
  );

  const ReattributeCustomerModalCallback = useCallback(() => {
    if (!customer) {
      return null;
    }

    return (
      <ReattributeCustomerModal
        customer={customer}
        showModal
        setShowModal={(show) => {
          if (!show) {
            setCustomer(null);
            setOnSuccess(undefined);
          }
        }}
        onSuccess={onSuccess}
      />
    );
  }, [customer, onSuccess]);

  return useMemo(
    () => ({
      openReattributeCustomerModal,
      ReattributeCustomerModal: ReattributeCustomerModalCallback,
      isReattributeCustomerModalOpen: customer !== null,
    }),
    [openReattributeCustomerModal, ReattributeCustomerModalCallback, customer],
  );
}
