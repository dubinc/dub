"use client";

import { motion } from "framer-motion";

export default function ProgressBar({
  value,
  max,
}: {
  value?: number;
  max?: number;
}) {
  return (
    <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
      <motion.div
        initial={{ width: 0 }}
        animate={{
          width: value && max ? (value / max) * 100 + "%" : "0%",
        }}
        transition={{ duration: 0.5, type: "spring" }}
        className={`${
          value && max && value > max ? "bg-red-500" : "bg-blue-500"
        } h-full`}
      />
    </div>
  );
}
