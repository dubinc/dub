"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { Modal, MoneyBills2 } from "@dub/ui";
import { X } from "lucide-react";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { PayoutMethodSelector } from "./payout-method-selector";

function SelectPayoutMethodModal({
  showModal,
  setShowModal,
}: {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { availablePayoutMethods } = usePartnerProfile();

  const isOnlyPayoutMethod = availablePayoutMethods.length === 1;

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="max-w-xl"
    >
      <div className="relative flex items-start justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-900">
            <MoneyBills2 className="size-5 text-neutral-700" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-neutral-800">
              {isOnlyPayoutMethod
                ? "Connect your payout method"
                : "Select a payout method"}
            </h3>
            <p className="mt-1 text-sm text-neutral-500">
              {isOnlyPayoutMethod
                ? "Set up your payout method to receive payouts."
                : "Select your preferred payout method to receive payouts."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(false)}
          className="group shrink-0 rounded-full p-2 text-neutral-500 transition-all duration-75 hover:bg-neutral-100 focus:outline-none active:bg-neutral-200"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="px-4 py-4 sm:px-6">
        <PayoutMethodSelector payoutMethods={availablePayoutMethods} />
      </div>
    </Modal>
  );
}

export function useSelectPayoutMethodModal() {
  const [showModal, setShowModal] = useState(false);

  const SelectPayoutMethodModalElement = useMemo(
    () => (
      <SelectPayoutMethodModal
        showModal={showModal}
        setShowModal={setShowModal}
      />
    ),
    [showModal],
  );

  return useMemo(
    () => ({
      setShowSelectPayoutMethodModal: setShowModal,
      SelectPayoutMethodModal: SelectPayoutMethodModalElement,
    }),
    [SelectPayoutMethodModalElement, setShowModal],
  );
}
