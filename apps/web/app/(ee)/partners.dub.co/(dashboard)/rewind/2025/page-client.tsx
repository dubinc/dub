"use client";

import { PartnerRewindProps } from "@/lib/types";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Conclusion } from "./conclusion";
import { Intro } from "./intro";
import { Rewind } from "./rewind";

export function PartnerRewind2025PageClient({
  partnerRewind,
}: {
  partnerRewind: PartnerRewindProps;
}) {
  const router = useRouter();

  const [state, setState] = useState<"intro" | "rewind" | "conclusion">(
    "intro",
  );

  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.div
        key={state}
        initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
        transition={{ duration: 0.5 }}
      >
        {state === "intro" && <Intro onStart={() => setState("rewind")} />}
        {state === "rewind" && (
          <Rewind
            partnerRewind={partnerRewind}
            onComplete={() => setState("conclusion")}
          />
        )}
        {state === "conclusion" && (
          <Conclusion
            onRestart={() => setState("intro")}
            onClose={() => router.push("/")}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
