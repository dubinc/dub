export const MARKETPLACE_REWARD_TYPES = {
  sale: "Sale reward (CPS)",
  lead: "Lead reward (CPL)",
  click: "Click reward (CPC)",
  discount: "Dual-sided incentives",
} as const;

export type MarketplaceRewardType = keyof typeof MARKETPLACE_REWARD_TYPES;
