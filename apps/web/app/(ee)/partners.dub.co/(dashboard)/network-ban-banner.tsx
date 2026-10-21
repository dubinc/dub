"use client";

import { buttonVariants, TriangleWarning } from "@dub/ui";
import { cn } from "@dub/utils";
import { motion } from "motion/react";

export function NetworkBanBanner() {
  return (
    <motion.div
      initial={{ transform: "translateY(-100%)" }}
      animate={{ transform: "translateY(0)" }}
      className="fixed left-0 right-0 top-0 z-30 flex h-9 items-center justify-between gap-4 overflow-hidden bg-red-600 px-2 text-white sm:px-4"
    >
      <div className="flex min-w-0 items-center gap-2">
        <TriangleWarning className="size-4 shrink-0" variant="fill" />
        <p className="min-w-0 truncate text-sm font-medium">
          <span className="sm:hidden">
            You&rsquo;re banned from the Dub Partner Network.
          </span>
          <span className="hidden sm:inline">
            Your account is banned from the Dub Partner Network. Payouts and new
            program applications are disabled.
          </span>
        </p>
      </div>
      <a
        href="https://dub.co/contact/support"
        className={cn(
          buttonVariants({ variant: "secondary" }),
          "flex h-6 w-fit shrink-0 items-center whitespace-nowrap rounded-lg border px-1.5 text-xs font-medium",
        )}
      >
        Appeal
      </a>
    </motion.div>
  );
}
