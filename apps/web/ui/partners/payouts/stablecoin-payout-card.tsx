"use client";

import usePartnerProfile from "@/lib/swr/use-partner-profile";
import { StablecoinPayoutIcon } from "@/ui/partners/payouts/stablecoin-payout-icon";
import { usePayoutConnectFlow } from "@/ui/partners/payouts/use-payout-connect-flow";
import { useStablecoinPayoutPromo } from "@/ui/partners/payouts/use-stablecoin-payout-promo";
import { Grid, buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import { AnimatePresence, motion } from "motion/react";

export function StablecoinPayoutCard() {
  const { partner } = usePartnerProfile();
  const { status } = useStablecoinPayoutPromo();
  const { StablecoinPayoutModal, connect } = usePayoutConnectFlow();

  if (!partner || status !== "card") return null;

  return (
    <>
      {StablecoinPayoutModal}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "border-border-subtle relative m-3 mt-8 select-none gap-2 overflow-hidden rounded-lg border bg-white",
          )}
        >
          <div className="absolute inset-0 [background-image:radial-gradient(200%_150%_at_100%_0%,#635BFF22,transparent_50%)]">
            <Grid
              cellSize={32}
              strokeWidth={2}
              patternOffset={[-8, -12]}
              className="text-border-subtle/40 [mask-image:linear-gradient(45deg,black_50%,#0003_100%)]"
            />
          </div>

          <button
            type="button"
            onClick={() => connect("stablecoin")}
            className="relative flex w-full flex-col gap-3 p-3 text-left"
          >
            <div
              className="animate-float"
              style={{ "--r": "1%" } as React.CSSProperties}
            >
              <StablecoinPayoutIcon className="m-4 rotate-[-8deg] scale-125" />
            </div>

            <div className="flex flex-col">
              <span className="text-content-emphasis line-clamp-1 text-sm font-semibold">
                Stablecoin payouts
              </span>
              <p className="text-content-subtle line-clamp-2 text-xs">
                Connect your crypto wallet and get paid in USDC within minutes.
              </p>
            </div>

            <span
              className={cn(
                buttonVariants({ variant: "primary" }),
                "flex h-6 w-fit items-center justify-center whitespace-nowrap rounded-md border px-1.5 text-xs",
              )}
            >
              Connect wallet
            </span>
          </button>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
