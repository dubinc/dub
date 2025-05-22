"use client";

import { X } from "@/ui/shared/icons";
import { AnimatedSizeContainer, GreekTemple, Modal, Stripe } from "@dub/ui";
import { CSSProperties, Dispatch, SetStateAction, useState } from "react";

const PAYMENT_PROCESSORS = [
  {
    id: "us_bank_account",
    location: "US",
    method: "ACH",
    icon: Stripe,
  },
  {
    id: "acss_debit",
    location: "CA",
    method: "ACSS Debit",
    icon: Stripe,
  },
  {
    id: "sepa_debit",
    location: "EU",
    method: "SEPA Debit",
    icon: Stripe,
  },
  {
    id: "au_becs_debit",
    location: "AUS",
    method: "AU BECS Debit",
    icon: Stripe,
  },
];

function AddPayoutMethodModal({
  showAddPayoutMethodModal,
  setShowAddPayoutMethodModal,
}: {
  showAddPayoutMethodModal: boolean;
  setShowAddPayoutMethodModal: Dispatch<SetStateAction<boolean>>;
}) {
  return (
    <Modal
      showModal={showAddPayoutMethodModal}
      setShowModal={setShowAddPayoutMethodModal}
      className="max-h-[calc(100dvh-100px)] max-w-xl"
    >
      <AddPayoutMethodModalInner
        setShowAddPayoutMethodModal={setShowAddPayoutMethodModal}
      />
    </Modal>
  );
}

function AddPayoutMethodModalInner({
  setShowAddPayoutMethodModal,
}: {
  setShowAddPayoutMethodModal: Dispatch<SetStateAction<boolean>>;
}) {
  const [paymentProcessorIndex, setPaymentProcessorIndex] = useState<
    number | null
  >(null);

  return (
    <AnimatedSizeContainer
      height
      transition={{ duration: 0.1, ease: "easeInOut" }}
    >
      <div className="p-4 sm:p-8">
        <button
          type="button"
          onClick={() => setShowAddPayoutMethodModal(false)}
          className="group absolute right-4 top-4 z-[1] hidden rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200 md:block"
        >
          <X className="size-5" />
        </button>

        <div>
          <div className="flex size-12 items-center justify-center rounded-full border border-neutral-200 text-neutral-900">
            <GreekTemple className="size-8 [&_*]:stroke-1 [&_circle]:hidden" />
          </div>
          <h3 className="mt-6 text-lg font-semibold text-neutral-800">
            Connect your bank account
          </h3>
          <p className="mt-2 text-base text-neutral-500">
            Select your bank’s location to
          </p>
          <div
            className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
            style={
              {
                "--cols": PAYMENT_PROCESSORS.length,
              } as CSSProperties
            }
          >
            {PAYMENT_PROCESSORS.map(
              ({ icon: Icon, name, shortName }, index) => (
                <button
                  key={index}
                  type="button"
                  className="group flex flex-col items-center rounded-lg bg-neutral-200/40 p-8 pb-6 transition-colors duration-100 hover:bg-neutral-200/60"
                  onClick={() => {
                    setPaymentProcessorIndex(index);
                  }}
                >
                  <Icon className="h-11 transition-transform duration-100 group-hover:-translate-y-0.5" />
                  <span className="mt-3 text-center text-sm font-medium text-neutral-700 sm:mt-8">
                    {shortName || name}
                  </span>
                </button>
              ),
            )}
          </div>
        </div>
      </div>
    </AnimatedSizeContainer>
  );
}

export function useAddPayoutMethodModal() {
  const [showAddPayoutMethodModal, setShowAddPayoutMethodModal] =
    useState(false);

  return {
    setShowAddPayoutMethodModal,
    AddPayoutMethodModal: (
      <AddPayoutMethodModal
        showAddPayoutMethodModal={showAddPayoutMethodModal}
        setShowAddPayoutMethodModal={setShowAddPayoutMethodModal}
      />
    ),
  };
}
