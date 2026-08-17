"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import type { PaymentMethodMicrodeposit } from "@/lib/stripe/microdeposit-types";
import { mutatePrefix } from "@/lib/swr/mutate";
import useWorkspace from "@/lib/swr/use-workspace";
import { Button, Input, Label, Modal } from "@dub/ui";
import { formatDate } from "@dub/utils";
import { Dispatch, SetStateAction, useState } from "react";
import { toast } from "sonner";

const DESCRIPTOR_PREFIX = "SM";

function parseDollarAmountToCents(value: string): number | null {
  const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ""));

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed * 100);
}

// Users only type the 4-character suffix; SM is shown as a prefix and prepended on submit.
// If they paste a full code (SM11AA / SM-11AA), strip the prefix so we don't double it.
function normalizeDescriptorSuffix(value: string): string {
  const alphanumeric = value.replace(/[^0-9a-z]/gi, "").toUpperCase();
  const suffix = alphanumeric.startsWith(DESCRIPTOR_PREFIX)
    ? alphanumeric.slice(DESCRIPTOR_PREFIX.length)
    : alphanumeric;

  return suffix.slice(0, 4);
}

function VerifyMicrodepositsModal({
  showModal,
  setShowModal,
  paymentMethodId,
  microdeposit,
}: {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  paymentMethodId: string;
  microdeposit: PaymentMethodMicrodeposit;
}) {
  const { slug, role } = useWorkspace();
  const [amount1, setAmount1] = useState("");
  const [amount2, setAmount2] = useState("");
  const [descriptorCode, setDescriptorCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const billingWriteError = clientAccessCheck({
    action: "billing.write",
    role,
    customPermissionDescription: "verify payment methods",
  }).error;

  const isDescriptorCode = microdeposit.type === "descriptor_code";
  const arrivalDate = microdeposit.arrivalDate
    ? formatDate(new Date(microdeposit.arrivalDate * 1000), {
        month: "short",
        day: "numeric",
      })
    : null;

  const resetForm = () => {
    setAmount1("");
    setAmount2("");
    setDescriptorCode("");
  };

  const handleSubmit = async () => {
    if (isSubmitting || billingWriteError) {
      return;
    }

    let body: {
      paymentMethodId: string;
      amounts?: [number, number];
      descriptorCode?: string;
    } = { paymentMethodId };

    if (isDescriptorCode) {
      const suffix = normalizeDescriptorSuffix(descriptorCode);

      if (!/^[0-9A-Z]{4}$/.test(suffix)) {
        toast.error(
          "Enter the 6-digit code from the statement descriptor of this deposit.",
        );
        return;
      }

      body.descriptorCode = `${DESCRIPTOR_PREFIX}${suffix}`;
    } else {
      const first = parseDollarAmountToCents(amount1);
      const second = parseDollarAmountToCents(amount2);

      if (
        first === null ||
        second === null ||
        first < 1 ||
        first > 99 ||
        second < 1 ||
        second > 99
      ) {
        toast.error(
          "Enter both deposit amounts in dollars, e.g. 0.32 and 0.45.",
        );
        return;
      }

      body.amounts = [first, second];
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/workspaces/${slug}/billing/payment-methods/verify-microdeposits`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      if (!response.ok) {
        const { error } = await response.json();
        toast.error(error.message);
        return;
      }

      await mutatePrefix(`/api/workspaces/${slug}/billing/payment-methods`);
      toast.success("Bank account verified!");
      resetForm();
      setShowModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="max-w-md"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="divide-y divide-neutral-200">
          <div className="p-4 sm:px-6">
            <h3 className="text-content-emphasis text-lg font-medium">
              Verify bank account
            </h3>
            <p className="mt-1 text-sm text-neutral-600">
              {isDescriptorCode
                ? "Stripe sent a small deposit to this bank account. To verify this account, please confirm the 6-digit code in the statement descriptor of this deposit."
                : arrivalDate
                  ? `Stripe sent two small deposits to this bank account. Enter the amounts below to verify it. They typically appear by ${arrivalDate}.`
                  : "Stripe sent two small deposits to this bank account. Enter the amounts below to verify it. They typically appear within 1–2 business days."}
            </p>
          </div>
          <div className="flex flex-col gap-4 bg-neutral-50 px-4 py-6 sm:px-6">
            {isDescriptorCode ? (
              <div className="grid gap-1.5">
                <Label htmlFor="descriptor-code">Descriptor code</Label>
                <div className="flex w-full max-w-md items-center rounded-md border border-neutral-300 bg-white px-3 focus-within:border-neutral-500 focus-within:ring-1 focus-within:ring-neutral-500">
                  <span className="text-sm text-neutral-500">
                    {DESCRIPTOR_PREFIX}
                  </span>
                  <input
                    id="descriptor-code"
                    value={descriptorCode}
                    onChange={(e) =>
                      setDescriptorCode(
                        normalizeDescriptorSuffix(e.target.value),
                      )
                    }
                    placeholder="XXXX"
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="min-w-0 flex-1 border-0 bg-transparent py-2 uppercase text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-0 sm:text-sm"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="microdeposit-amount-1">First amount</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-neutral-500">
                      $
                    </span>
                    <Input
                      id="microdeposit-amount-1"
                      inputMode="decimal"
                      placeholder="0.32"
                      value={amount1}
                      onChange={(e) => setAmount1(e.target.value)}
                      autoComplete="off"
                      className="max-w-none pl-7"
                    />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="microdeposit-amount-2">Second amount</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-neutral-500">
                      $
                    </span>
                    <Input
                      id="microdeposit-amount-2"
                      inputMode="decimal"
                      placeholder="0.45"
                      value={amount2}
                      onChange={(e) => setAmount2(e.target.value)}
                      autoComplete="off"
                      className="max-w-none pl-7"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 px-4 py-4 sm:px-6">
          <Button
            type="button"
            variant="secondary"
            className="h-8 w-fit"
            text="Cancel"
            disabled={isSubmitting}
            onClick={() => setShowModal(false)}
          />
          <Button
            type="submit"
            className="h-8 w-fit"
            text="Verify"
            loading={isSubmitting}
            disabledTooltip={billingWriteError}
          />
        </div>
      </form>
    </Modal>
  );
}

export function useVerifyMicrodepositsModal({
  paymentMethodId,
  microdeposit,
}: {
  paymentMethodId: string;
  microdeposit: PaymentMethodMicrodeposit;
}) {
  const [showVerifyMicrodepositsModal, setShowVerifyMicrodepositsModal] =
    useState(false);

  return {
    setShowVerifyMicrodepositsModal,
    verifyMicrodepositsModal: (
      <VerifyMicrodepositsModal
        showModal={showVerifyMicrodepositsModal}
        setShowModal={setShowVerifyMicrodepositsModal}
        paymentMethodId={paymentMethodId}
        microdeposit={microdeposit}
      />
    ),
  };
}
