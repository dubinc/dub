"use client";

import { MarkdownDescription } from "@/ui/shared/markdown-description";
import { Badge, Button, CircleDollar3, Modal, ShimmerDots } from "@dub/ui";
import { TriangleWarning } from "@dub/ui/icons";
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
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <Modal showModal={showModal} setShowModal={setShowModal}>
      <div className="relative flex flex-col overflow-hidden rounded-t-2xl">
        <div className="relative flex h-48 items-center justify-center overflow-hidden">
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(https://assets.dub.co/misc/stablecoin-payouts-modal-bg.jpg)`,
            }}
          />
          {/* Shimmer overlay */}
          <ShimmerDots
            dotSize={1}
            cellSize={4}
            speed={3}
            color={[1, 1, 1]}
            className="opacity-50"
          />
          {/* Pay Methods card stack – centered, matching design specs */}
          <div
            className="relative flex size-[132px] shrink-0 items-center justify-center rounded-[31px] bg-white"
            style={{
              background:
                "linear-gradient(180deg, rgba(238, 221, 238, 0.025) 0%, rgba(74, 0, 74, 0.025) 100%), #FFFFFF",
              boxShadow:
                "0px 114px 46px rgba(0, 0, 0, 0.01), 0px 64px 39px rgba(0, 0, 0, 0.05), 0px 29px 29px rgba(0, 0, 0, 0.09), 0px 7px 16px rgba(0, 0, 0, 0.1), inset 0px -4px 2px #FFFFFF",
            }}
          >
            {/* Middle ellipse */}
            <div
              className="flex size-[82px] shrink-0 items-center justify-center rounded-full"
              style={{
                background: "linear-gradient(180deg, #F0F0F0 0%, #F0F0F0 100%)",
                boxShadow: "0px 4px 4px rgba(0, 0, 0, 0.01)",
              }}
            >
              {/* Inner circle (stablecoin icon container) */}
              <div
                className="flex size-[70px] shrink-0 items-center justify-center rounded-full"
                style={{
                  background: "#155DFC",
                  boxShadow:
                    "0px 2px 2px rgba(0, 0, 0, 0.08), inset 0px 4px 6px rgba(255, 255, 255, 0.25), inset 0px -3px 10px rgba(0, 0, 0, 0.25)",
                }}
              >
                <CircleDollar3
                  className="size-14 text-white"
                  strokeWidth={2.5}
                  aria-hidden
                />
              </div>
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
            Stablecoin payouts
          </h3>

          <MarkdownDescription className="text-sm leading-5 text-neutral-600">
            With [stablecoin
            payouts](https://dub.co/help/article/receiving-payouts#connecting-a-stablecoin-wallet),
            you can get paid USDC anywhere in the world in minutes – instead of
            waiting up to 15 business days with your bank account.
          </MarkdownDescription>

          <div className="mt-4 flex flex-col gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <TriangleWarning className="size-3.5 text-amber-500" />
            <p className="text-sm leading-5 text-amber-900">
              Make sure to triple-check that you’ve entered the{" "}
              <strong className="underline underline-offset-2">
                correct stablecoin wallet address and network
              </strong>{" "}
              when connecting your wallet.
              <br />
              <br />
              Since stablecoin payouts are irreversible, incorrect details may
              result in payout failures and lost funds.
            </p>
          </div>

          <div className="mt-4">
            <label className="mb-4 flex cursor-pointer gap-3 rounded-lg border border-neutral-300 p-3">
              <div className="flex h-5 items-center">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
              </div>
              <span className="text-sm leading-5 text-neutral-900">
                I acknowledge that I will triple-check my stablecoin wallet
                address and network, and any payout failures due to incorrect
                details will be my sole responsibility.
              </span>
            </label>

            <Button
              text="Connect stablecoin wallet"
              variant="primary"
              className="w-full rounded-lg"
              loading={isLoading}
              disabled={!acknowledged}
              disabledTooltip={
                !acknowledged
                  ? "You must acknowledge the requirements before continuing."
                  : undefined
              }
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
