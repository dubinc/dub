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
 * When cancel-at-period-end is set, `subscriptionCanceledAt` uses Stripe's Unix
 * timestamps (`cancel_at`, then `canceled_at`) so the value is stable across webhooks.
 * `billingCycleEndsAt` uses subscription item `current_period_end` (Basil API).
 */
export function getSubscriptionCancellationFields(
  subscription?: Pick<
    Stripe.Subscription,
    "cancel_at_period_end" | "cancel_at" | "canceled_at" | "items"
  >,
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
  const cancelAtUnix =
    subscription.cancel_at ?? subscription.canceled_at ?? null;
  return {
    subscriptionCanceledAt:
      cancelAtPeriodEnd && cancelAtUnix != null
        ? new Date(Number(cancelAtUnix) * 1000)
        : null,
    billingCycleEndsAt:
      currentPeriodEnd != null
        ? new Date(Number(currentPeriodEnd) * 1000)
        : null,
  };
}
