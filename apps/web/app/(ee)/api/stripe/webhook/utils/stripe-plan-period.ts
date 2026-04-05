import { PlanPeriod } from "@dub/prisma/client";
import type Stripe from "stripe";

export function getPlanPeriodFromStripeSubscription(
  subscription: Stripe.Subscription,
): PlanPeriod | undefined {
  const { interval, interval_count } =
    subscription.items.data[0]?.price?.recurring ?? {};
  if (interval === "month") {
    if (interval_count === 3) {
      return PlanPeriod.quarterly;
    }
    return PlanPeriod.monthly;
  }
  if (interval === "year") {
    return PlanPeriod.yearly;
  }
  if (interval === "week" && interval_count === 2) {
    return PlanPeriod.biweekly;
  }
  return undefined;
}
