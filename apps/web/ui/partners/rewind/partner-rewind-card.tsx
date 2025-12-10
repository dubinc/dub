"use client";

import usePartnerRewind from "@/lib/swr/use-partner-rewind";
import { Grid, buttonVariants } from "@dub/ui";
import { cn } from "@dub/utils";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePartnerRewindStatus } from "./use-partner-rewind-status";

export function PartnerRewindCard() {
  const pathname = usePathname();

  const { partnerRewind } = usePartnerRewind();
  const { status } = usePartnerRewindStatus();

  if (!partnerRewind || status !== "card") return null;

  return (
    <AnimatePresence>
      {!pathname.endsWith("/rewind/2025") && (
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
            <img
              src="https://assets.dub.co/misc/partner-rewind-2025/revenue.png"
              alt=""
              className="h-20 object-contain object-left"
            />

            <div className="flex flex-col">
              <span className="text-content-emphasis line-clamp-1 text-sm font-semibold">
                Dub Partner Rewind &rsquo;25
              </span>
              <p className="text-content-subtle line-clamp-2 text-xs">
                See how you performed this year on Dub Partners!
              </p>
            </div>

            <Link
              href="/rewind/2025"
              className={cn(
                buttonVariants({ variant: "primary" }),
                "flex h-6 w-fit items-center justify-center whitespace-nowrap rounded-md border px-1.5 text-xs",
              )}
            >
              View your rewind
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
