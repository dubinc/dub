import { PLANS, type Plan } from "../constants";

export const getPlanFromPriceId = (priceId: string): Plan | null => {
  return PLANS.find((plan) => plan.price.ids?.includes(priceId)) || null;
};
