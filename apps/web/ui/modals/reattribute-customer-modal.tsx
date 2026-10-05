"use client";

import { mutatePrefix } from "@/lib/swr/mutate";
import { useApiMutation } from "@/lib/swr/use-api-mutation";
import useWorkspace from "@/lib/swr/use-workspace";
import { CommissionsCount, CustomerEnriched, CustomerProps } from "@/lib/types";
import { PartnerLinkSelector } from "@/ui/partners/partner-link-selector";
import { PartnerSelector } from "@/ui/partners/partner-selector";
import { AnimatedSizeContainer, Button, Checkbox, Modal } from "@dub/ui";
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
  const [verification, setVerification] = useState("");

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
      setVerification("");
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
  const currentPartnerId = customer.partner?.id ?? null;
  const isPartnerDifferent =
    Boolean(partnerId) && partnerId !== currentPartnerId;
  const confirmationText = "confirm attribute customer";
  const isVerified = verification === confirmationText;

  const onSubmit = async (data: FormData) => {
    if (!isPartnerDifferent || !data.partnerId || !data.linkId || !isVerified) {
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
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="flex items-center justify-between gap-2 border-b border-neutral-200 px-4 py-4 sm:px-6">
        <h3 className="text-lg font-medium">Attribute to partner</h3>
      </div>

      <div className="bg-neutral-50">
        <form
          onSubmit={(e) => {
            e.stopPropagation();
            return handleSubmit(onSubmit)(e);
          }}
        >
          <AnimatedSizeContainer
            height
            className="flex flex-col"
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          >
            <div className="flex flex-col gap-6 px-4 py-6 text-left sm:px-6">
              <div>
                <label className="text-sm font-medium text-neutral-600">
                  Partner
                </label>
                <div className="mt-1.5">
                  <PartnerSelector
                    selectedPartnerId={partnerId}
                    setSelectedPartnerId={(id) => {
                      setValue("partnerId", id, { shouldDirty: true });
                      setValue(
                        "linkId",
                        id === currentPartnerId
                          ? customer.link?.id ?? null
                          : null,
                        { shouldDirty: true },
                      );
                    }}
                  />
                </div>
                {currentPartnerId && (
                  <p className="mt-1.5 text-xs text-neutral-500">
                    Attribute this customer to a different partner. Unpaid
                    commissions will be transferred to the new partner as well.
                  </p>
                )}
              </div>

              {isPartnerDifferent && (
                <>
                  <div>
                    <label className="text-sm font-medium text-neutral-600">
                      Referral link
                    </label>
                    <div className="mt-1.5">
                      <PartnerLinkSelector
                        selectedLinkId={linkId}
                        partnerId={partnerId}
                        showDestinationUrl={false}
                        setSelectedLinkId={(id) =>
                          setValue("linkId", id, { shouldDirty: true })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="verification"
                      className="text-sm font-medium text-neutral-600"
                    >
                      To verify, type{" "}
                      <span className="font-semibold text-neutral-800">
                        {confirmationText}
                      </span>{" "}
                      below
                    </label>
                    <input
                      type="text"
                      name="verification"
                      id="verification"
                      pattern={confirmationText}
                      required
                      autoComplete="off"
                      placeholder={confirmationText}
                      value={verification}
                      onChange={(e) => setVerification(e.target.value)}
                      className="mt-1.5 block w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 shadow-sm transition-colors focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                    />
                  </div>

                  {showClawback && (
                    <label className="flex items-start gap-2.5 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
                      <Checkbox
                        checked={createClawback}
                        onCheckedChange={(checked) =>
                          setValue("createClawback", checked === true, {
                            shouldDirty: true,
                          })
                        }
                        className="mt-0.5 data-[state=checked]:bg-black"
                      />
                      <span className="text-sm text-neutral-700">
                        Create a clawback for the{" "}
                        <span className="font-medium text-neutral-900">
                          {currencyFormatter(paidEarnings)}
                        </span>{" "}
                        in commissions that were already paid to the previous
                        partner.
                      </span>
                    </label>
                  )}
                </>
              )}

              {commissionsCountError && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
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
            </div>
          </AnimatedSizeContainer>

          <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-4 sm:px-6">
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
                !isPartnerDifferent ||
                !linkId ||
                Boolean(commissionsCountError) ||
                !isVerified
              }
            />
          </div>
        </form>
      </div>
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
