"use client";

import useWorkspace from "@/lib/swr/use-workspace";
import { useTrialLimitActivateModal } from "@/ui/modals/trial-limit-activate-modal";
import { Button, Crown, TriangleWarning, useMediaQuery } from "@dub/ui";
import {
  cn,
  getTrialLimitResourceForOverageBanner,
  isWorkspaceBillingTrialActive,
} from "@dub/utils";
import { motion } from "motion/react";
import Link from "next/link";
import ManageSubscriptionButton from "../workspaces/manage-subscription-button";

export function useUpgradeBannerVisibility() {
  const {
    exceededEvents,
    exceededLinks,
    exceededPayouts,
    paymentFailedAt,
    subscriptionCanceledAt,
  } = useWorkspace();

  const needsUpgrade = exceededEvents || exceededLinks || exceededPayouts;
  const subscriptionCanceled =
    subscriptionCanceledAt && new Date(subscriptionCanceledAt) < new Date();

  return {
    isVisible: needsUpgrade || !!paymentFailedAt || subscriptionCanceled,
    needsUpgrade,
    paymentFailed: !!paymentFailedAt,
    subscriptionCanceled,
  };
}

export function UpgradeBanner() {
  const { slug, exceededEvents, exceededLinks, exceededPayouts, trialEndsAt } =
    useWorkspace();
  const { openTrialLimitModal, TrialLimitActivateModal } =
    useTrialLimitActivateModal();
  const trialActive = isWorkspaceBillingTrialActive(trialEndsAt);

  const { isVisible, needsUpgrade, paymentFailed, subscriptionCanceled } =
    useUpgradeBannerVisibility();

  const overageLimitResource = getTrialLimitResourceForOverageBanner({
    exceededEvents: Boolean(exceededEvents),
    exceededLinks: Boolean(exceededLinks),
    exceededPayouts: Boolean(exceededPayouts),
  });

  const customButtonClassname = "ml-4 h-7 w-fit px-2.5 text-sm font-medium";

  const { isMobile } = useMediaQuery();

  if (!isVisible) return null;

  return (
    <>
      <TrialLimitActivateModal />
      <motion.div
        initial={{ transform: "translateY(-100%)" }}
        animate={{ transform: "translateY(0)" }}
        className={cn(
          "fixed left-0 right-0 top-0 z-50 flex items-center justify-center overflow-hidden px-6 py-2 text-white sm:h-12 sm:py-0",
          needsUpgrade ? "bg-amber-600" : "bg-red-600",
        )}
      >
        {needsUpgrade ? (
          <Crown className="mr-2 size-4 shrink-0" />
        ) : (
          <TriangleWarning className="mr-2 size-4 shrink-0" variant="fill" />
        )}
        <p className="text-sm">
          {needsUpgrade ? (
            <>
              You&rsquo;ve hit the{" "}
              <Link href={`/${slug}/settings/billing`} className="underline">
                monthly{" "}
                {exceededEvents
                  ? "events"
                  : exceededLinks
                    ? "links"
                    : "payouts"}{" "}
                limit
              </Link>
              <span className="xs:inline hidden">
                &nbsp;on your current plan
              </span>
              <span className="hidden md:inline">
                . Upgrade to avoid service disruption.
              </span>
            </>
          ) : subscriptionCanceled ? (
            "Your subscription has been canceled. To reactivate, please upgrade to a paid plan."
          ) : (
            "Your last payment failed. Please update your payment method to avoid service disruption."
          )}
        </p>
        {needsUpgrade || subscriptionCanceled ? (
          trialActive ? (
            <Button
              text="Upgrade"
              variant="secondary"
              onClick={() =>
                openTrialLimitModal(
                  overageLimitResource ??
                    (exceededEvents
                      ? "clicks"
                      : exceededLinks
                        ? "links"
                        : "payouts"),
                )
              }
              className={customButtonClassname}
            />
          ) : (
            <Link href={`/${slug}/settings/billing/upgrade`}>
              <Button
                text="Upgrade"
                variant="secondary"
                className={customButtonClassname}
              />
            </Link>
          )
        ) : (
          <ManageSubscriptionButton
            text={isMobile ? "Update" : "Update Payment Method"}
            variant="secondary"
            className={customButtonClassname}
          />
        )}
      </motion.div>
    </>
  );
}
