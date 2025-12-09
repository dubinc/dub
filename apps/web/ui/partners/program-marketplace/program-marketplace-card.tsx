"use client";

import { partnerCanViewMarketplace } from "@/lib/network/get-discoverability-requirements";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import useProgramEnrollments from "@/lib/swr/use-program-enrollments";
import { useProgramMarketplacePromo } from "@/ui/partners/program-marketplace/use-program-marketplace-promo";
import { Grid, buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ProgramMarketplaceLogos } from "./program-marketplace-logos";

export function ProgramMarketplaceCard() {
  const pathname = usePathname();

  const { partner } = usePartnerProfile();
  const { programEnrollments } = useProgramEnrollments();

  const { status } = useProgramMarketplacePromo();

  if (
    !partner ||
    !programEnrollments ||
    !partnerCanViewMarketplace({ partner, programEnrollments }) ||
    status !== "card"
  )
    return null;

  return (
    <AnimatePresence>
      {!pathname.endsWith("/programs/marketplace") && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "border-border-subtle relative m-3 mt-8 select-none gap-2 overflow-hidden rounded-lg border bg-white",
          )}
        >
          <div className="absolute inset-0 [background-image:radial-gradient(200%_150%_at_100%_0%,#855AFC22,transparent_50%)]">
            <Grid
              cellSize={32}
              strokeWidth={2}
              patternOffset={[-8, -12]}
              className="text-border-subtle/40 [mask-image:linear-gradient(45deg,black_50%,#0003_100%)]"
            />
          </div>

          <div className="relative flex flex-col gap-3 p-3">
            <div className="h-24 w-40">
              <ProgramMarketplaceLogos />
            </div>

            <div className="flex flex-col">
              <span className="text-content-emphasis line-clamp-1 text-sm font-semibold">
                Program Marketplace
              </span>
              <p className="text-content-subtle line-clamp-2 text-xs">
                Browse and apply for more programs on Dub.
              </p>
            </div>

            <Link
              href="/programs/marketplace"
              className={cn(
                buttonVariants({ variant: "primary" }),
                "flex h-6 w-fit items-center justify-center whitespace-nowrap rounded-md border px-1.5 text-xs",
              )}
            >
              View the marketplace
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
