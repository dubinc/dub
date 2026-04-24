import { PlanPeriod } from "@dub/prisma/client";
import type Stripe from "stripe";

export function getPlanPeriodFromStripeSubscription(
  subscription: Stripe.Subscription,
): PlanPeriod | undefined {
  const recurring = subscription.items.data[0]?.price?.recurring;
  if (!recurring) {
    return undefined;
  }

  const { interval, interval_count } = recurring;
  if (interval === "month" && interval_count === 3) {
    return PlanPeriod.quarterly;
  }
  if (interval === "month" && interval_count === 1) {
    return PlanPeriod.monthly;
  }
  if (interval === "year" && interval_count === 1) {
    return PlanPeriod.yearly;
  }
  if (interval === "week" && interval_count === 2) {
    return PlanPeriod.biweekly;
  }
  return undefined;
}
