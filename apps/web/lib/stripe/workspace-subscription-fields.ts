import type Stripe from "stripe";

/**
 * Derives workspace `trialEndsAt` from a Stripe subscription (platform billing).
 */
export function getSubscriptionTrialEndsAt(
  subscription?: Pick<Stripe.Subscription, "status" | "trial_end">,
): Date | null | undefined {
  if (!subscription) {
    return undefined;
  }
  if (subscription.status === "trialing" && subscription.trial_end) {
    return new Date(subscription.trial_end * 1000);
  }
  return null;
}

/**
 * Derives `subscriptionCanceledAt` and `billingCycleEndsAt` from Stripe.
 * Uses subscription item `current_period_end` (Basil API) when cancel-at-period-end is set.
 */
export function getSubscriptionCancellationFields(
  subscription?: Pick<Stripe.Subscription, "cancel_at_period_end" | "items">,
): {
  subscriptionCanceledAt: Date | null;
  billingCycleEndsAt: Date | null;
} {
  if (!subscription) {
    return {
      subscriptionCanceledAt: null,
      billingCycleEndsAt: null,
    };
  }
  const cancelAtPeriodEnd = subscription.cancel_at_period_end ?? false;
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;
  return {
    subscriptionCanceledAt: cancelAtPeriodEnd ? new Date() : null,
    billingCycleEndsAt:
      cancelAtPeriodEnd && currentPeriodEnd != null
        ? new Date(Number(currentPeriodEnd) * 1000)
        : null,
  };
}
