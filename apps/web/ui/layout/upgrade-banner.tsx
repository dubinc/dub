"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { Crown } from "@dub/ui";
import { cn, getNextPlan } from "@dub/utils";
import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo } from "react";

export function UpgradeBanner() {
  const {
    slug,
    plan,
    usage,
    usageLimit,
    linksUsage,
    linksLimit,
    payoutsUsage,
    payoutsLimit,
    paymentFailedAt,
  } = useWorkspace();

  const needsUpgrade = useMemo(
    () =>
      [
        [usage, usageLimit],
        [linksUsage, linksLimit],
        [payoutsUsage, payoutsLimit],
      ].some(
        ([usage, limit]) =>
          usage !== undefined && limit !== undefined && usage > limit,
      ),
    [usage, usageLimit, linksUsage, linksLimit, payoutsUsage, payoutsLimit],
  );

  if (!needsUpgrade && !paymentFailedAt) return null;

  return (
    <motion.div
      initial={{ height: 0 }}
      animate={{ height: "48px" }}
      className="text-content-inverted bg-bg-inverted flex h-12 items-center justify-center overflow-hidden px-6"
    >
      {needsUpgrade && <Crown className="mr-2 size-4 shrink-0" />}
      <p className="text-sm">
        {needsUpgrade ? (
          <>
            You&rsquo;ve hit the{" "}
            <Link href={`/${slug}/settings/billing`} className="underline">
              monthly usage limit
            </Link>
            <span className="xs:inline hidden">&nbsp;on your current plan</span>
            <span className="hidden md:inline">
              . Upgrade to keep creating.
            </span>
          </>
        ) : (
          <>
            Your last payment failed. Please update your payment method to
            continue using Dub.
          </>
        )}
      </p>
      <Link
        href={
          needsUpgrade
            ? `/${slug}/settings/billing/upgrade`
            : `/${slug}/settings/billing`
        }
        className={cn(
          "bg-bg-default text-content-emphasis border-border-subtle ml-4 flex h-7 items-center justify-center rounded-lg border px-2.5 text-sm font-medium",
          "hover:bg-bg-subtle transition-colors duration-150",
        )}
      >
        {needsUpgrade ? (
          <>
            Upgrade
            <span className="hidden sm:inline">
              &nbsp;to {getNextPlan(plan).name}
            </span>
          </>
        ) : (
          <>Update Payment Method</>
        )}
      </Link>
    </motion.div>
  );
}
