"use client";

import { DIRECT_DEBIT_PAYMENT_TYPES_INFO } from "@/lib/partners/constants";
import useWorkspace from "@/lib/swr/use-workspace";
import { X } from "@/ui/shared/icons";
import { AnimatedSizeContainer, GreekTemple, Modal } from "@dub/ui";
import { cn, COUNTRIES } from "@dub/utils";
import { useRouter } from "next/navigation";
import { CSSProperties, Dispatch, SetStateAction, useState } from "react";
import { toast } from "sonner";
import Stripe from "stripe";

function AddPaymentMethodModal({
  showAddPaymentMethodModal,
  setShowAddPaymentMethodModal,
}: {
  showAddPaymentMethodModal: boolean;
  setShowAddPaymentMethodModal: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <Modal
      showModal={showAddPaymentMethodModal}
      setShowModal={setShowAddPaymentMethodModal}
      className="max-h-[calc(100dvh-100px)] max-w-xl"
    >
      <AddPaymentMethodModalInner
        setShowAddPaymentMethodModal={setShowAddPaymentMethodModal}
      />
    </Modal>
  );
}

function AddPaymentMethodModalInner({
  setShowAddPaymentMethodModal,
}: {
  setShowAddPaymentMethodModal: Dispatch<SetStateAction<boolean>>;
}) {
  const router = useRouter();
  const { slug, plan } = useWorkspace();
  const [isLoading, setIsLoading] = useState(false);

  const addPaymentMethod = async (type: Stripe.PaymentMethod.Type) => {
    setIsLoading(true);

    const response = await fetch(
      `/api/workspaces/${slug}/billing/payment-methods`,
      {
        method: "POST",
        body: JSON.stringify({
          method: type,
        }),
      },
    );

    if (!response.ok) {
      setIsLoading(false);
      toast.error("Failed to add payment method. Please try again.");
      return;
    }

    const data = (await response.json()) as { url: string };

    router.push(data.url);
  };

  return (
    <AnimatedSizeContainer
      height
      transition={{ duration: 0.1, ease: "easeInOut" }}
    >
      <div className="p-4 sm:p-8">
        <button
          type="button"
          onClick={() => setShowAddPaymentMethodModal(false)}
          className="group absolute right-4 top-4 z-[1] hidden rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200 md:block"
        >
          <X className="size-5" />
        </button>

        <div className="flex flex-col gap-7">
          <div className="flex size-12 items-center justify-center rounded-full border border-neutral-200 text-neutral-900">
            <GreekTemple className="size-5 [&_*]:stroke-1 [&_circle]:hidden" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-neutral-800">
              Connect your bank account
            </h3>
            <p className="mt-1 text-base text-neutral-500">
              Select your bank's location to connect your bank account.
            </p>
          </div>

          <div
            className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
            style={
              {
                "--cols": DIRECT_DEBIT_PAYMENT_TYPES_INFO.length,
              } as CSSProperties
            }
          >
            {DIRECT_DEBIT_PAYMENT_TYPES_INFO.map(
              (
                {
                  type,
                  location,
                  title,
                  icon: Icon,
                  recommended,
                  enterpriseOnly,
                },
                index,
              ) => (
                <button
                  key={index}
                  type="button"
                  className="group flex flex-col items-center justify-end gap-4 rounded-lg bg-neutral-200/40 p-8 px-2 py-4 transition-colors duration-100 hover:bg-neutral-200/60 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => addPaymentMethod(type)}
                  disabled={
                    isLoading || (enterpriseOnly && plan !== "enterprise")
                  }
                >
                  <span
                    className={cn(
                      "rounded-full bg-neutral-200 px-2 py-0.5 text-xs font-semibold text-neutral-600",
                      recommended && "bg-blue-100 text-blue-700",
                      enterpriseOnly && "bg-violet-100 text-violet-700",
                    )}
                  >
                    {recommended
                      ? "Recommended"
                      : enterpriseOnly
                        ? "Enterprise only"
                        : `${COUNTRIES[location]} only`}
                  </span>
                  <img
                    src={Icon}
                    alt={location}
                    className="size-12 rounded-full transition-transform duration-100 group-hover:-translate-y-0.5"
                  />
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-center text-sm font-semibold text-neutral-700">
                      {location}
                    </span>
                    <span className="text-center text-xs font-medium text-neutral-700">
                      {title}
                    </span>
                  </div>
                </button>
              ),
            )}
          </div>
        </div>
      </div>
    </AnimatedSizeContainer>
  );
}

export function useAddPaymentMethodModal() {
  const [showAddPaymentMethodModal, setShowAddPaymentMethodModal] =
    useState(false);

  return {
    setShowAddPaymentMethodModal,
    AddPaymentMethodModal: (
      <AddPaymentMethodModal
        showAddPaymentMethodModal={showAddPaymentMethodModal}
        setShowAddPaymentMethodModal={setShowAddPaymentMethodModal}
      />
    ),
  };
}
