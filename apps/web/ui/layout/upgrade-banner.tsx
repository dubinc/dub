"use client";

import { clientAccessCheck } from "@/lib/client-access-check";
import { useDashboardBannerVisible } from "@/lib/hooks/use-dashboard-banner-visible";
import useWorkspace from "@/lib/swr/use-workspace";
import { useRetryPaymentModal } from "@/ui/modals/retry-payment-modal";
import { useTrialLimitActivateModal } from "@/ui/modals/trial-limit-activate-modal";
import {
  Button,
  buttonVariants,
  Crown,
  DynamicTooltipWrapper,
  TriangleWarning,
} from "@dub/ui";
import {
  cn,
  getTrialLimitResourceForOverageBanner,
  isWorkspaceBillingTrialActive,
} from "@dub/utils";
import { motion } from "motion/react";
import Link from "next/link";
import { ReactNode } from "react";

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
  const {
    slug,
    exceededEvents,
    exceededLinks,
    exceededPayouts,
    trialEndsAt,
    role,
  } = useWorkspace();
  const { openTrialLimitModal, TrialLimitActivateModal } =
    useTrialLimitActivateModal();
  const { setShowRetryPaymentModal, RetryPaymentModal } =
    useRetryPaymentModal();
  const trialActive = isWorkspaceBillingTrialActive(trialEndsAt);

  const { needsUpgrade, subscriptionCanceled } = useUpgradeBannerVisibility();
  const { isUpgradeBannerVisible } = useDashboardBannerVisible();

  const permissionsError = clientAccessCheck({
    action: "billing.write",
    role,
  }).error;

  const overageLimitResource = getTrialLimitResourceForOverageBanner({
    exceededEvents: Boolean(exceededEvents),
    exceededLinks: Boolean(exceededLinks),
    exceededPayouts: Boolean(exceededPayouts),
  });

  const customButtonClassname = "h-6 w-fit shrink-0 px-1.5 text-xs font-medium";

  const paymentMethodLink = (text: string) => (
    <Link
      href={`/${slug}/settings/billing#payment-methods`}
      className="underline"
    >
      {text}
    </Link>
  );

  if (!isUpgradeBannerVisible) return null;

  return (
    <>
      <TrialLimitActivateModal />
      <RetryPaymentModal />
      <motion.div
        initial={{ transform: "translateY(-100%)" }}
        animate={{ transform: "translateY(0)" }}
        className={cn(
          "fixed left-0 right-0 top-0 z-30 flex h-9 items-center justify-between gap-4 overflow-hidden px-2 text-white sm:px-4",
          needsUpgrade ? "bg-amber-600" : "bg-red-600",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {needsUpgrade ? (
            <Crown className="size-4 shrink-0" />
          ) : (
            <TriangleWarning className="size-4 shrink-0" variant="fill" />
          )}
          <p className="min-w-0 truncate text-sm font-medium">
            {needsUpgrade ? (
              <>
                You&rsquo;ve hit the{" "}
                <Link href={`/${slug}/settings/billing`} className="underline">
                  {exceededEvents
                    ? "events"
                    : exceededLinks
                      ? "links"
                      : "payouts"}{" "}
                  limit
                </Link>
                <span className="hidden sm:inline"> on your current plan</span>
              </>
            ) : subscriptionCanceled ? (
              <BreakpointText
                short="Your subscription has been canceled."
                medium="Your subscription has been canceled. Upgrade to a paid plan."
                long="Your subscription has been canceled. To reactivate, please upgrade to a paid plan."
              />
            ) : (
              <BreakpointText
                short={
                  <>
                    Payment failed.{" "}
                    {paymentMethodLink("Update payment method.")}
                  </>
                }
                medium={
                  <>
                    Payment failed.{" "}
                    {paymentMethodLink("Update your payment method")} to avoid
                    service disruption.
                  </>
                }
                long={
                  <>
                    Your last payment failed. Please{" "}
                    {paymentMethodLink("update your payment method")} to avoid
                    service disruption.
                  </>
                }
              />
            )}
          </p>
        </div>
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
            <Link
              href={`/${slug}/settings/billing/upgrade`}
              className={cn(
                buttonVariants({ variant: "secondary" }),
                "flex items-center whitespace-nowrap rounded-lg border",
                customButtonClassname,
              )}
            >
              Upgrade
            </Link>
          )
        ) : (
          <DynamicTooltipWrapper
            tooltipProps={
              permissionsError ? { content: permissionsError } : undefined
            }
          >
            <Button
              text="Retry"
              variant="secondary"
              disabled={Boolean(permissionsError)}
              onClick={() => setShowRetryPaymentModal(true)}
              className={customButtonClassname}
            />
          </DynamicTooltipWrapper>
        )}
      </motion.div>
    </>
  );
}

// Mobile shows `short`, sm shows `medium`, md and up shows `long`
function BreakpointText({
  short,
  medium,
  long,
}: {
  short: ReactNode;
  medium: ReactNode;
  long: ReactNode;
}) {
  return (
    <>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline md:hidden">{medium}</span>
      <span className="hidden md:inline">{long}</span>
    </>
  );
}
