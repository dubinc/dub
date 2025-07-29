import { TPaymentPlan } from "../integration/payment/config";

export const subscriptionPlansWeight = {
  PRICE_MONTH_PLAN: 1,
  PRICE_QUARTER_PLAN: 2,
  PRICE_YEAR_PLAN: 3,
};

export const getSubscriptionRenewalAction = (
  newSubscriptionPlan: TPaymentPlan,
  currentSubscriptionPlan: TPaymentPlan,
) => {
  switch (true) {
    case newSubscriptionPlan === currentSubscriptionPlan:
      return "upgrade";
    case subscriptionPlansWeight[newSubscriptionPlan] <
      subscriptionPlansWeight?.[currentSubscriptionPlan!]:
      return "downgrade";
    default:
      return "upgrade";
  }
};
