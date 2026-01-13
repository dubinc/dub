import { dismissUnlocksBannerAction } from "@/lib/actions/partners/dismiss-unlocks-banner";
import { mutatePrefix } from "@/lib/swr/mutate";
import {
  Button,
  buttonVariants,
  ChevronUp,
  CircleCheckFill,
  CircleDotted,
  ExpandingArrow,
  Lock,
  LockOpen2,
  ProgressCircle,
} from "@dub/ui";
import { cn, isClickOnInteractiveChild } from "@dub/utils";
import { motion } from "motion/react";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { ComponentProps, ReactNode, useState } from "react";
import { toast } from "sonner";
import { usePartnerUnlocks } from "./use-partner-unlocks";

export function ProfileUnlocksGuide() {
  const [isExpanded, setIsExpanded] = useState(false);
  const unlocks = usePartnerUnlocks();

  const { executeAsync: dismissBanner, isPending: isDismissing } = useAction(
    dismissUnlocksBannerAction,
    {
      onSuccess: () => {
        toast.success("Unlocks guide dismissed");
        mutatePrefix("/api/partner-profile");
      },
      onError: ({ error }) => {
        toast.error(error.serverError || "Failed to dismiss");
      },
    },
  );

  if (!unlocks) return null;

  const { categories, totalTasks, completedTasks } = unlocks;
  const allTasksCompleted = completedTasks === totalTasks;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <div className="text-content-inverted rounded-xl bg-neutral-900">
          {/* Collapsed Header */}
          <div
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
            className="flex cursor-pointer select-none items-center gap-4 p-3 pr-6"
            onClick={(e) => {
              if (isClickOnInteractiveChild(e)) return;
              setIsExpanded((prev) => !prev);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsExpanded((prev) => !prev);
              }
            }}
          >
            {/* Lock Icon */}
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10">
              {allTasksCompleted ? (
                <LockOpen2 className="size-5 text-neutral-300" />
              ) : (
                <Lock className="size-5 text-neutral-300" />
              )}
            </div>

            {/* Title and Progress */}
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">Dub unlocks</h2>
              <div className="flex items-center gap-1.5">
                <ProgressCircle
                  progress={totalTasks === 0 ? 0 : completedTasks / totalTasks}
                  className="text-green-500 [--track-color:#fff3]"
                />
                <span className="text-content-inverted/60 text-sm">
                  {completedTasks} of {totalTasks} tasks completed
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-4">
              {allTasksCompleted && (
                <Button
                  type="button"
                  text="Dismiss"
                  variant="secondary"
                  className="h-8 px-3 text-sm"
                  loading={isDismissing}
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissBanner({});
                  }}
                />
              )}
              <ChevronUp
                className={cn(
                  "text-content-inverted/60 size-4.5 shrink-0 transition-transform duration-200",
                  isExpanded && "-rotate-180",
                )}
              />
            </div>
          </div>

          {/* Expanded Content */}
          <motion.div
            initial={false}
            animate={{
              height: isExpanded ? "auto" : 0,
              opacity: isExpanded ? 1 : 0,
            }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-4 rounded-b-xl bg-neutral-800 p-4">
              {categories.map((category) => (
                <div key={category.title}>
                  {/* Category Header */}
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {category.title}
                      </h3>
                      <p className="text-xs text-neutral-400">
                        {category.description}
                      </p>
                    </div>
                    {category.action && (
                      <Link
                        href={category.action.href}
                        className={cn(
                          buttonVariants({ variant: "secondary" }),
                          "flex h-8 shrink-0 items-center justify-center whitespace-nowrap rounded-md border px-3 text-sm",
                        )}
                      >
                        {category.action.label}
                      </Link>
                    )}
                  </div>

                  {/* Task Grid */}
                  <div className="rounded-lg bg-white/5 p-1">
                    <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                      {category.tasks.map(({ label, completed, href }) => (
                        <ConditionalLink
                          key={label}
                          href={completed ? undefined : href}
                          className={cn(
                            "group flex items-center justify-between gap-2 rounded-md px-3 py-2",
                            !completed &&
                              href &&
                              "transition-colors duration-100 ease-out hover:bg-white/10",
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            {completed ? (
                              <CircleCheckFill className="size-4 shrink-0 text-green-500" />
                            ) : (
                              <CircleDotted className="size-4 shrink-0 text-neutral-400" />
                            )}
                            <span className="min-w-0 truncate text-sm">
                              {label}
                            </span>
                          </div>
                          {!completed && href && (
                            <div className="shrink-0 pr-4">
                              <ExpandingArrow className="group-hover:text-content-inverted text-neutral-500" />
                            </div>
                          )}
                        </ConditionalLink>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
      </div>
    </motion.div>
  );
}

type ConditionalLinkProps = {
  href?: string;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentProps<typeof Link>, "href">;

function ConditionalLink({
  href,
  className,
  children,
  ...rest
}: ConditionalLinkProps) {
  return href ? (
    <Link href={href} className={className} {...rest}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  );
}
