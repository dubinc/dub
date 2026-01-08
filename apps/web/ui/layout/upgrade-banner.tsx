"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { Crown } from "@dub/ui";
import { cn } from "@dub/utils";
import { motion } from "motion/react";
import Link from "next/link";
import ManageSubscriptionButton from "../workspaces/manage-subscription-button";

export function useUpgradeBannerVisible() {
  const { exceededEvents, exceededLinks, exceededPayouts, paymentFailedAt } =
    useWorkspace();

  const needsUpgrade = exceededEvents || exceededLinks || exceededPayouts;
  return needsUpgrade || !!paymentFailedAt;
}

export function UpgradeBanner() {
  const { slug, exceededEvents, exceededLinks, exceededPayouts } =
    useWorkspace();

  const needsUpgrade = exceededEvents || exceededLinks || exceededPayouts;

  const isVisible = useUpgradeBannerVisible();
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ transform: "translateY(-100%)" }}
      animate={{ transform: "translateY(0)" }}
      className="text-content-inverted bg-bg-inverted fixed left-0 right-0 top-0 z-50 flex h-12 items-center justify-center overflow-hidden px-6"
    >
      {needsUpgrade && <Crown className="mr-2 size-4 shrink-0" />}
      <p className="text-sm">
        {needsUpgrade ? (
          <>
            You&rsquo;ve hit the{" "}
            <Link href={`/${slug}/settings/billing`} className="underline">
              monthly{" "}
              {exceededEvents ? "events" : exceededLinks ? "links" : "payouts"}{" "}
              limit
            </Link>
            <span className="xs:inline hidden">&nbsp;on your current plan</span>
            <span className="hidden md:inline">
              . Upgrade to keep using Dub.
            </span>
          </>
        ) : (
          <>
            Your last payment failed. Please update your payment method to
            continue using Dub.
          </>
        )}
      </p>
      {needsUpgrade ? (
        <Link
          href={`/${slug}/settings/billing/upgrade`}
          className={cn(
            "bg-bg-default text-content-emphasis border-border-subtle ml-4 flex h-7 items-center justify-center rounded-lg border px-2.5 text-sm font-medium",
            "hover:bg-bg-subtle transition-colors duration-150",
          )}
        >
          Upgrade
        </Link>
      ) : (
        <ManageSubscriptionButton
          text="Update Payment Method"
          variant="secondary"
          className="ml-4 h-7 w-fit px-2.5 text-sm font-medium"
        />
      )}
    </motion.div>
  );
}
