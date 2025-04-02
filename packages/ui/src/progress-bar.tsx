"use client";

import { cn } from "@dub/utils";
import { motion } from "framer-motion";

export function ProgressBar({
  value = 0,
  max = 100,
  className,
}: {
  value?: number;
  max?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-3 w-full overflow-hidden rounded-full bg-neutral-200",
        className,
      )}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{
          width: value && max ? (value / max) * 100 + "%" : "0%",
        }}
        transition={{ duration: 0.5, type: "spring", delay: 0.2 }}
        className={`${
          value && max && value > max ? "bg-red-500" : "bg-blue-500"
        } h-full`}
      />
    </div>
  );
}
