import { PlanDetails, TRIAL_LIMITS } from "@dub/utils";
import type Stripe from "stripe";
import { getPlanPeriodFromStripeSubscription } from "./get-plan-period-from-stripe-subscription";

export function getWorkspaceLimitsFromStripeSubscription({
  planLimits,
  subscription,
}: {
  planLimits: PlanDetails["limits"];
  subscription: Stripe.Subscription;
}): PlanDetails["limits"] {
  if (subscription.status !== "trialing") {
    const subscriptionPeriod =
      getPlanPeriodFromStripeSubscription(subscription);
    return {
      ...planLimits,
      ...(subscriptionPeriod === "yearly"
        ? {
            clicks: planLimits.clicks * 12,
            links: planLimits.links * 12,
            payouts: planLimits.payouts * 12,
            ai: planLimits.ai * 12,
          }
        : {}),
    };
  }

  return {
    ...planLimits,
    links: TRIAL_LIMITS.links,
    clicks: TRIAL_LIMITS.clicks,
    payouts: TRIAL_LIMITS.payouts,
    users: TRIAL_LIMITS.users,
    domains: TRIAL_LIMITS.domains,
    tags: TRIAL_LIMITS.tags,
    partnerTags: TRIAL_LIMITS.partnerTags,
    folders: TRIAL_LIMITS.folders,
    groups: TRIAL_LIMITS.groups,
    networkInvites: TRIAL_LIMITS.networkInvites,
    partners: TRIAL_LIMITS.partners,
    ai: TRIAL_LIMITS.ai,
    api: TRIAL_LIMITS.api,
    analyticsApi: TRIAL_LIMITS.analyticsApi,
  };
}
