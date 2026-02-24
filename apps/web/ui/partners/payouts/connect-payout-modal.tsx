"use client";

import usePartnerPayoutSettings from "@/lib/swr/use-partner-payout-settings";
import { Modal, MoneyBills2 } from "@dub/ui";
import { X } from "lucide-react";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import { PayoutMethodSelector } from "./payout-method-cards";

function ConnectPayoutModal({
  showModal,
  setShowModal,
}: {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
}) {
  const { payoutMethods, isLoading: isPayoutMethodsLoading } =
    usePartnerPayoutSettings();

  const isOnlyPayoutMethod = payoutMethods.length === 1;

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
              {isPayoutMethodsLoading
                ? "Loading…"
                : isOnlyPayoutMethod
                  ? "Connect your payout method"
                  : "Select a payout method"}
            </h3>
            <p className="mt-0.5 text-sm text-neutral-500">
              {isPayoutMethodsLoading
                ? "Loading payout methods."
                : isOnlyPayoutMethod
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

      <div className="px-4 py-4 pt-0 sm:px-6">
        {isPayoutMethodsLoading ? (
          <PayoutMethodSelectorSkeleton />
        ) : (
          <PayoutMethodSelector payoutMethods={payoutMethods} />
        )}
      </div>
    </Modal>
  );
}

function PayoutMethodSelectorSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="flex flex-col rounded-xl border border-neutral-200 bg-neutral-100 p-4"
          aria-hidden
        >
          <div className="size-10 animate-pulse rounded-lg bg-neutral-200" />
          <div className="mt-2 h-4 w-24 animate-pulse rounded bg-neutral-200" />
          <ul className="mt-2.5 space-y-2.5">
            {[1, 2, 3].map((j) => (
              <li
                key={j}
                className="h-3 w-full animate-pulse rounded bg-neutral-200"
              />
            ))}
          </ul>
          <div className="mt-4 h-9 w-full animate-pulse rounded-lg bg-neutral-200" />
        </div>
      ))}
    </div>
  );
}

export function useConnectPayoutModal() {
  const [showModal, setShowModal] = useState(false);

  const ConnectPayoutModalElement = useMemo(
    () => (
      <ConnectPayoutModal showModal={showModal} setShowModal={setShowModal} />
    ),
    [showModal],
  );

  return useMemo(
    () => ({
      setShowConnectPayoutModal: setShowModal,
      ConnectPayoutModal: ConnectPayoutModalElement,
    }),
    [ConnectPayoutModalElement, setShowModal],
  );
}
