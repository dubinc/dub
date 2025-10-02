import { PartnerProps } from "@/lib/types";
import { Button, ChevronUp, ProgressCircle } from "@dub/ui";
import { cn, isClickOnInteractiveChild } from "@dub/utils";
import { motion } from "motion/react";
import { useState } from "react";

export function ProfileDiscoveryGuide({ partner }: { partner: PartnerProps }) {
  if (partner.discoverableAt) return null;

  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div
        className="text-content-inverted rounded-2xl bg-neutral-900 p-2"
        onClick={(e) => {
          if (isClickOnInteractiveChild(e)) return;
          setIsExpanded((e) => !e);
        }}
      >
        <div className="flex select-none flex-col px-3 pb-4 pt-1">
          <div className="flex justify-between">
            <div className="bg-bg-default/10 mb-4 flex w-fit items-center gap-1.5 rounded-md px-2 py-1">
              <ProgressCircle
                progress={1 / 6}
                className="text-green-500 [--track-color:#fff3]"
              />
              <span className="text-xs font-medium">
                1 of 6 tasks completed
              </span>
            </div>
            <Button
              type="button"
              onClick={() => setIsExpanded((e) => !e)}
              variant="outline"
              className="hover:bg-bg-default/10 size-9 p-0"
              icon={
                <ChevronUp
                  className={cn(
                    "text-content-inverted size-4 transition-transform duration-100",
                    !isExpanded && "-scale-y-100",
                  )}
                />
              }
            />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Get discovered</h2>
            <p className="text-content-inverted/60 text-base">
              Finish these steps to show up in Partner Discovery and get invited
              to more programs.
            </p>
          </div>
        </div>

        <motion.div
          initial={false}
          animate={{
            height: isExpanded ? "auto" : 0,
            opacity: isExpanded ? 1 : 0,
          }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="rounded-lg bg-neutral-800 p-2">WIP</div>
        </motion.div>
      </div>
    </motion.div>
  );
}
