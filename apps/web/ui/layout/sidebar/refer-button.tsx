"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { DubWidget } from "@dub/embed-react";
import { Gift } from "@dub/ui/src/icons";
import { cn } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function ReferButton() {
  const { id: workspaceId, flags, referralLinkId } = useWorkspace();

  const [publicToken, setPublicToken] = useState<string | null>(null);

  // Get publicToken from server when component mounts
  const createPublicToken = async () => {
    const response = await fetch(`/api/workspaces/${workspaceId}/embed-token`, {
      method: "POST",
    });

    if (!response.ok) {
      throw toast.error("Failed to create public token");
    }

    const { publicToken } = (await response.json()) as {
      publicToken: string;
    };

    setPublicToken(publicToken);
  };

  useEffect(() => {
    if (flags && flags.referrals && referralLinkId) {
      createPublicToken();
    }
  }, [flags, referralLinkId]);

  if (!flags?.referrals || !referralLinkId || !publicToken) return null;

  return (
    <DubWidget token={publicToken} trigger="manual">
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
