"use client";

import { partnerCanViewMarketplace } from "@/lib/network/get-discoverability-requirements";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { useProgramMarketplacePromo } from "@/ui/partners/program-marketplace/use-program-marketplace-promo";
import { X } from "@/ui/shared/icons";
import { Button, Grid, buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { ProgramMarketplaceLogos } from "./program-marketplace-logos";

export function ProgramMarketplaceBanner() {
  const { partner } = usePartnerProfile();
  const { programEnrollments } = useProgramEnrollments();
  const { status, setStatus } = useProgramMarketplacePromo();

  return (
    <AnimatePresence>
      {partner &&
        programEnrollments &&
        partnerCanViewMarketplace({ partner, programEnrollments }) &&
        status === "banner" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "border-border-subtle relative mb-4 gap-x-2 overflow-hidden rounded-xl border bg-white sm:h-12 lg:mb-6",
              )}
            >
              <div className="absolute inset-0">
                <div
                  className={cn(
                    "absolute inset-0 opacity-10 blur-xl sm:-scale-x-100 sm:opacity-20",
                    "[background-image:radial-gradient(140%_146%_at_93%_14%,#72FE7D,rgba(114,254,125,0)_50%),radial-gradient(126%_82%_at_56%_100%,#FD3A4E,rgba(253,58,78,0)_50%),radial-gradient(131%_124%_at_11%_35%,#855AFC,rgba(133,90,252,0)_50%),radial-gradient(117%_77%_at_100%_100%,#E4C795,rgba(228,199,149,0)_50%),radial-gradient(86%_74%_at_40%_59%,#3A8BFD,rgba(58,139,253,0)_50%),radial-gradient(115%_96%_at_42%_69%,#EEA5BA,rgba(238,165,186,0)_50%)]",
                  )}
                />
                <Grid
                  cellSize={32}
                  strokeWidth={2}
                  patternOffset={[-8, -12]}
                  className="text-border-subtle/40 [mask-image:linear-gradient(90deg,black_50%,#0003_100%)]"
                />
              </div>

              <div className="relative flex h-full flex-col justify-between sm:flex-row">
                <div className="flex h-full min-w-0 flex-col gap-x-2 sm:flex-row sm:items-center">
                  <div className="h-full shrink-0 overflow-hidden p-3 sm:p-0">
                    <div className="relative h-24 w-40 sm:h-full sm:w-24">
                      <div className="absolute left-2 right-0 top-1/2 h-full -translate-y-1/2">
                        <ProgramMarketplaceLogos className="[--logo-size:32px] sm:[--logo-size:18px]" />
                      </div>
                    </div>
                  </div>

                  <p
                    className="text-content-subtle flex min-w-0 flex-col px-3 text-base sm:block sm:truncate sm:px-0 sm:text-sm xl:text-base"
                    title="Program Marketplace is here. Browse and apply for more programs on Dub."
                  >
                    <span className="text-content-emphasis font-semibold">
                      Program Marketplace is here.
                    </span>{" "}
                    <span className="font-medium">
                      Browse and apply for more programs on Dub.
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2 p-3 sm:px-2 sm:py-0">
                  <Link
                    href="/programs/marketplace"
                    className={cn(
                      buttonVariants({ variant: "primary" }),
                      "flex h-8 w-fit items-center justify-center whitespace-nowrap rounded-lg border px-3 text-sm",
                    )}
                  >
                    View the marketplace
                  </Link>

                  {/* > mobile close button */}
                  <Button
                    variant="outline"
                    icon={<X className="size-4" />}
                    className="hidden size-8 rounded-lg bg-black/5 p-0 hover:bg-black/10 sm:flex"
                    onClick={() => setStatus("card")}
                  />
                </div>
              </div>

              {/* Mobile close button */}
              <Button
                variant="outline"
                icon={<X className="size-4" />}
                className="absolute right-2 top-2 size-8 rounded-lg bg-black/5 p-0 hover:bg-black/10 sm:hidden"
                onClick={() => setStatus("card")}
              />
            </div>
          </motion.div>
        )}
    </AnimatePresence>
  );
}
