"use client";

import { MarkdownDescription } from "@/ui/shared/markdown-description";
import { Badge, Button, CircleDollar3, Modal } from "@dub/ui";
import { Dispatch, SetStateAction, useMemo, useState } from "react";

function StablecoinPayoutModal({
  showModal,
  setShowModal,
  onContinue,
}: {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  onContinue: () => Promise<void>;
}) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      className="max-w-md"
    >
      <div className="relative flex flex-col overflow-hidden rounded-t-2xl">
        <div className="relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative flex size-20 shrink-0 items-center justify-center rounded-2xl bg-white shadow-lg">
            <div className="flex size-12 items-center justify-center rounded-full bg-[#635BFF]">
              <CircleDollar3 className="size-7 text-white" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 p-8">
          <div className="flex items-center gap-2">
            <Badge
              variant="green"
              className="rounded-md font-semibold text-green-700"
            >
              NEW
            </Badge>
          </div>

          <h3 className="text-lg font-semibold text-neutral-900">
            Stablecoin payouts are here!
          </h3>

          <MarkdownDescription className="text-sm leading-5 text-neutral-600">
            You can now connect your crypto wallet for payouts. With [stablecoin
            payouts](https://dub.co/help/article/receiving-payouts#stablecoin-payouts),
            you can get paid USDC worldwide in seconds, instead of waiting days
            with a bank account.
          </MarkdownDescription>

          <div className="mt-4">
            <Button
              text="Connect Stablecoin"
              variant="primary"
              className="w-full rounded-lg"
              loading={isLoading}
              onClick={async () => {
                setIsLoading(true);
                try {
                  await onContinue();
                } finally {
                  setIsLoading(false);
                }
              }}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function useStablecoinPayoutModal({
  onContinue,
}: {
  onContinue: () => Promise<void>;
}) {
  const [showModal, setShowModal] = useState(false);

  const StablecoinPayoutModalElement = useMemo(
    () => (
      <StablecoinPayoutModal
        showModal={showModal}
        setShowModal={setShowModal}
        onContinue={onContinue}
      />
    ),
    [showModal, onContinue],
  );

  return useMemo(
    () => ({
      setShowStablecoinPayoutModal: setShowModal,
      StablecoinPayoutModal: StablecoinPayoutModalElement,
    }),
    [StablecoinPayoutModalElement],
  );
}
