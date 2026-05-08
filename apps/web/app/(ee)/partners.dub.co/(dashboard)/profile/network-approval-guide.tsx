import { getNetworkProfileChecklistProgress } from "@/lib/network/get-network-profile-checklist-progress";
import usePartnerProfile from "@/lib/swr/use-partner-profile";
import {
  CircleCheckFill,
  CircleDotted,
  ExpandingArrow,
  ProgressCircle,
} from "@dub/ui";
import { cn, isClickOnInteractiveChild } from "@dub/utils";
import { motion } from "motion/react";
import Link from "next/link";
import { HTMLProps, useState } from "react";

export function NetworkApprovalGuide() {
  const { partner } = usePartnerProfile();

  if (!partner) return null;

  const { tasks, completedCount, totalCount, isComplete } =
    getNetworkProfileChecklistProgress({
      partner,
    });

  const [isExpanded, setIsExpanded] = useState(isComplete ? false : true);

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
        <div className="flex select-none flex-col p-3">
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-semibold">
              Join the Dub Partner Network
            </h2>

            <div className="bg-bg-default/10 flex w-fit items-center gap-1.5 rounded-md px-2 py-1">
              <ProgressCircle
                progress={completedCount / totalCount}
                className="text-green-500 [--track-color:#fff3]"
              />
              <span className="text-xs font-medium">
                {completedCount} of {totalCount} tasks completed
              </span>
            </div>
          </div>
          <p className="text-content-inverted/60 text-base">
            Complete the steps to join the Dub Partner Network and start
            applying to programs in our network.
          </p>
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
          <div
            className="grid grid-cols-1 rounded-lg bg-neutral-800 p-2 sm:grid-cols-2"
            onClick={(e) => e.stopPropagation()}
          >
            {tasks.map(({ label, completed, href }) => (
              <ConditionalLink
                key={label}
                href={completed ? undefined : href}
                className={cn(
                  "group flex items-center justify-between gap-2 rounded-md px-3 py-2",
                  !completed &&
                    href &&
                    "transition-colors duration-100 ease-out hover:bg-neutral-700",
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  {completed ? (
                    <CircleCheckFill className="size-4 shrink-0 text-green-500" />
                  ) : (
                    <CircleDotted className="size-4 shrink-0 text-neutral-400" />
                  )}
                  <span className="min-w-0 truncate text-sm">{label}</span>
                </div>
                {!completed && href && (
                  <div className="shrink-0 pr-4">
                    <ExpandingArrow className="group-hover:text-content-inverted text-neutral-500" />
                  </div>
                )}
              </ConditionalLink>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function ConditionalLink({
  href,
  className,
  children,
  ...rest
}: Partial<HTMLProps<HTMLAnchorElement>>) {
  return href ? (
    <Link href={href} className={className} {...rest}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}
