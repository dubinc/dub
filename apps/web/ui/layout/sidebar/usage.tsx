"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import ManageSubscriptionButton from "@/ui/workspaces/manage-subscription-button";
import { AnimatedSizeContainer, Icon, buttonVariants } from "@dub/ui";
import { CursorRays, Hyperlink } from "@dub/ui/src/icons";
import { cn, getFirstAndLastDay, getNextPlan, nFormatter } from "@dub/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CSSProperties, useMemo, useState } from "react";

export function Usage() {
  const { slug } = useParams() as { slug?: string };

  return slug ? <UsageInner /> : null;
}

function UsageInner() {
  const {
    usage,
    usageLimit,
    linksUsage,
    linksLimit,
    billingCycleStart,
    plan,
    slug,
    paymentFailedAt,
    loading,
  } = useWorkspace();

  const [billingEnd] = useMemo(() => {
    if (billingCycleStart) {
      const { lastDay } = getFirstAndLastDay(billingCycleStart);
      const end = lastDay.toLocaleDateString("en-us", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return [end];
    }
    return [];
  }, [billingCycleStart]);

  const [hovered, setHovered] = useState(false);

  const nextPlan = getNextPlan(plan);

  // Warn the user if they're >= 90% of any limit
  const warnings = useMemo(
    () =>
      [
        [usage, usageLimit],
        [linksUsage, linksLimit],
      ].map(
        ([usage, limit]) =>
          usage !== undefined &&
          limit !== undefined &&
          usage / Math.max(0, usage, limit) >= 0.9,
      ),
    [usage, usageLimit, linksUsage, linksLimit],
  );

  const warning = warnings.some((w) => w);

  return loading || usage !== undefined ? (
    <AnimatedSizeContainer height>
      <div className="border-t border-neutral-300/80 p-3">
        <Link
          className="group flex items-center gap-0.5 text-sm font-normal text-neutral-500 transition-colors hover:text-neutral-700"
          href={`/${slug}/settings/billing`}
        >
          Usage
          <ChevronRight className="size-3 text-neutral-400 transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-neutral-500" />
        </Link>

        <div className="mt-4 flex flex-col gap-4">
          <UsageRow
            icon={CursorRays}
            label="Events"
            usage={usage}
            limit={usageLimit}
            showNextPlan={hovered}
            nextPlanLimit={nextPlan?.limits.clicks}
            warning={warnings[0]}
          />
          <UsageRow
            icon={Hyperlink}
            label="Links"
            usage={linksUsage}
            limit={linksLimit}
            showNextPlan={hovered}
            nextPlanLimit={nextPlan?.limits.links}
            warning={warnings[1]}
          />
        </div>

        <div className="mt-3">
          {loading ? (
            <div className="h-4 w-2/3 animate-pulse rounded-md bg-neutral-500/10" />
          ) : (
            <p
              className={cn(
                "text-xs text-neutral-900/40",
                paymentFailedAt && "text-red-600",
              )}
            >
              {paymentFailedAt
                ? "Your last payment failed. Please update your payment method to continue using Dub."
                : `Usage will reset ${billingEnd}`}
            </p>
          )}
        </div>

        {paymentFailedAt ? (
          <ManageSubscriptionButton
            text="Update Payment Method"
            variant="primary"
            className="mt-4 w-full"
            onMouseEnter={() => {
              setHovered(true);
            }}
            onMouseLeave={() => {
              setHovered(false);
            }}
          />
        ) : warning || plan === "free" ? (
          <Link
            href={`/${slug}/upgrade`}
            className={cn(
              buttonVariants(),
              "mt-4 flex h-9 items-center justify-center rounded-md border px-4 text-sm",
            )}
            onMouseEnter={() => {
              setHovered(true);
            }}
            onMouseLeave={() => {
              setHovered(false);
            }}
          >
            {plan === "free" ? "Get Dub Pro" : "Upgrade plan"}
          </Link>
        ) : null}
      </div>
    </AnimatedSizeContainer>
  ) : null;
}

function UsageRow({
  icon: Icon,
  label,
  usage,
  limit,
  showNextPlan,
  nextPlanLimit,
  warning,
}: {
  icon: Icon;
  label: string;
  usage?: number;
  limit?: number;
  showNextPlan: boolean;
  nextPlanLimit?: number;
  warning: boolean;
}) {
  const loading = usage === undefined || limit === undefined;
  const unlimited = limit !== undefined && limit >= 1000000000;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 text-neutral-600" />
          <span className="text-xs font-medium text-neutral-700">{label}</span>
        </div>
        {!loading ? (
          <div className="flex items-center">
            <span className="text-xs font-medium text-neutral-600">
              {formatNumber(usage)} of{" "}
              <motion.span
                className={cn(
                  "relative transition-colors duration-150",
                  showNextPlan && nextPlanLimit
                    ? "text-neutral-400"
                    : "text-neutral-600",
                )}
              >
                {formatNumber(limit)}
                {showNextPlan && nextPlanLimit && (
                  <motion.span
                    className="absolute bottom-[45%] left-0 h-[1px] bg-neutral-400"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{
                      duration: 0.25,
                      ease: "easeInOut",
                    }}
                  />
                )}
              </motion.span>
            </span>
            <AnimatePresence>
              {showNextPlan && nextPlanLimit && (
                <motion.div
                  className="flex items-center"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{
                    duration: 0.25,
                    ease: [0.4, 0, 0.2, 1], // Custom cubic-bezier for smooth movement
                  }}
                >
                  <motion.span className="ml-1 whitespace-nowrap text-xs font-medium text-blue-600">
                    {formatNumber(nextPlanLimit)}
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="h-4 w-16 animate-pulse rounded-md bg-neutral-500/10" />
        )}
      </div>
      {!unlimited && (
        <div className="mt-1.5">
          <div
            className={cn(
              "h-0.5 w-full overflow-hidden rounded-full bg-neutral-900/10 transition-colors",
              loading && "bg-neutral-900/5",
            )}
          >
            {!loading && (
              <div
                className="animate-slide-right-fade size-full"
                style={{ "--offset": "-100%" } as CSSProperties}
              >
                <div
                  className={cn(
                    "size-full rounded-full bg-gradient-to-r from-transparent to-blue-600",
                    warning && "to-rose-500",
                  )}
                  style={{
                    transform: `translateX(-${100 - Math.floor((usage / Math.max(0, usage, limit)) * 100)}%)`,
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const formatNumber = (value: number) =>
  value >= 1000000000
    ? "∞"
    : nFormatter(value, {
        full: value !== undefined && value < 999999,
        digits: 1,
      });
