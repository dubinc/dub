import { PartnerProps } from "@/lib/types";
import {
  Button,
  ChevronUp,
  CircleCheckFill,
  CircleDotted,
  ExpandingArrow,
  ProgressCircle,
} from "@dub/ui";
import { cn, isClickOnInteractiveChild } from "@dub/utils";
import { motion } from "motion/react";
import Link from "next/link";
import { HTMLProps, useState } from "react";

export function ProfileDiscoveryGuide({ partner }: { partner: PartnerProps }) {
  if (partner.discoverableAt) return null;

  const [isExpanded, setIsExpanded] = useState(false);

  const tasks = [
    {
      label: "Add basic profile info",
      completed: true,
    },
    {
      label: "Verify your website or social account",
      href: "#sites",
      completed: false,
    },
    {
      label: "Write your bio",
      href: "#about",
      completed: false,
    },
    {
      label: "Select your industry interests",
      href: "#interests",
      completed: false,
    },
    {
      label: "Choose your sales channels",
      href: "#channels",
      completed: false,
    },
    {
      label: "Earn $100 in commissions",
      completed: false,
    },
  ];

  const completedTasks = tasks.filter(({ completed }) => completed);

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
                progress={completedTasks.length / tasks.length}
                className="text-green-500 [--track-color:#fff3]"
              />
              <span className="text-xs font-medium">
                {completedTasks.length} of {tasks.length} tasks completed
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
