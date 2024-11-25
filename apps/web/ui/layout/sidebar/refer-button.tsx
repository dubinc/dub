"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { DubWidget } from "@dub/embed-react";
import { Gift } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";

export function ReferButton() {
  const { flags } = useWorkspace();

  if (!flags || !flags.referrals) return null;

  return (
    <DubWidget
      // TODO: Fetch token for this workspace
      token="dub_embed_zNettp9ZaXTmdq3VM0lODQjeIfADNqM1qj2w"
      trigger="manual"
      placement="top-left"
    >
      <button
        type="button"
        className={cn(
          "font-lg relative size-4 shrink-0 overflow-hidden rounded-full transition-all active:scale-90 active:bg-gray-50",
          "outline-none ring-offset-2 ring-offset-neutral-100 focus-visible:ring-2 focus-visible:ring-black/50",
        )}
      >
        <AnimatePresence>
          <motion.div
            className="absolute inset-0 flex items-center justify-center font-medium text-neutral-500 hover:text-neutral-700"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
          >
            <Gift className="size-4" />
          </motion.div>
        </AnimatePresence>
      </button>
    </DubWidget>
  );
}
