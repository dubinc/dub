import { PlanPeriod } from "@dub/prisma/client";

export type SubscriptionItemsForPlanPeriod = {
  items: {
    data: Array<{
      price?: {
        recurring?: {
          interval?: string | null;
        } | null;
      } | null;
    }>;
  };
};

export function getPlanPeriodFromStripeSubscription(
  subscription: SubscriptionItemsForPlanPeriod,
): PlanPeriod | undefined {
  const interval = subscription.items.data[0]?.price?.recurring?.interval;
  if (interval === "month") {
    return PlanPeriod.monthly;
  }
  if (interval === "year") {
    return PlanPeriod.yearly;
  }
  return undefined;
}
