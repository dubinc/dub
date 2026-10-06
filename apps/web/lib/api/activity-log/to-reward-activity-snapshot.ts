import type { DiscountProps, LinkProps, RewardProps } from "@/lib/types";

export function toLinkActivitySnapshot(
  link: Pick<LinkProps, "id" | "domain" | "key">,
) {
  return {
    id: link.id,
    domain: link.domain,
    key: link.key,
  };
}

export function toRewardActivitySnapshot(
  reward: Pick<
    RewardProps,
    | "id"
    | "event"
    | "type"
    | "amountInCents"
    | "amountInPercentage"
    | "maxDuration"
    | "description"
    | "tooltipDescription"
    | "modifiers"
    | "config"
    | "spendLimitAmount"
    | "spendLimitInterval"
  >,
) {
  return {
    id: reward.id,
    event: reward.event,
    type: reward.type,
    amountInCents: reward.amountInCents ?? null,
    amountInPercentage: reward.amountInPercentage ?? null,
    maxDuration: reward.maxDuration ?? null,
    description: reward.description ?? null,
    tooltipDescription: reward.tooltipDescription ?? null,
    modifiers: reward.modifiers ?? null,
    config: reward.config ?? null,
    spendLimitAmount: reward.spendLimitAmount ?? null,
    spendLimitInterval: reward.spendLimitInterval ?? null,
  };
}

export function toDiscountActivitySnapshot(
  discount: Pick<
    DiscountProps,
    "id" | "amount" | "type" | "maxDuration" | "description"
  >,
) {
  return {
    id: discount.id,
    amount: discount.amount,
    type: discount.type,
    maxDuration: discount.maxDuration ?? null,
    description: discount.description ?? null,
  };
}
