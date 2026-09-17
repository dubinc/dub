import { toCentsNumber } from "@dub/utils";
import { EventType, Link, Prisma, Reward } from "@prisma/client";
import { serializeReward } from "../api/partners/serialize-reward";
import { prisma } from "../prisma";
import { RewardConditions, RewardContext, RewardProps } from "../types";
import {
  rewardConditionsArraySchema,
  RewardSchema,
} from "../zod/schemas/rewards";
import { aggregatePartnerLinksStats } from "./aggregate-partner-links-stats";
import { evaluateRewardConditions } from "./evaluate-reward-conditions";
import { getRewardAmount } from "./get-reward-amount";

const REWARD_EVENT_COLUMN_MAPPING = {
  [EventType.click]: "clickReward",
  [EventType.lead]: "leadReward",
  [EventType.sale]: "saleReward",
} as const;

interface ProgramEnrollmentWithReward {
  partner: { country: string | null };
  links: Link[] | null;
  totalCommissions: number | bigint;
  clickReward?: Reward | null;
  leadReward?: Reward | null;
  saleReward?: Reward | null;
}

interface ProductReward {
  reward: RewardProps;
  matchedCondition: RewardConditions | null;
  sale: {
    amount: number;
    quantity: number;
  };
}

interface LinkRewards {
  clickReward?: Reward | null;
  leadReward?: Reward | null;
  saleReward?: Reward | null;
}

type DeterminePartnerRewardResult = {
  reward: RewardProps;
  matchedCondition: RewardConditions | null;
};

export const getRewardMaxDurationForContext = ({
  reward,
  context,
}: {
  reward: Pick<Reward, "maxDuration" | "modifiers">;
  context?: RewardContext;
}): number | null => {
  if (!reward.modifiers || !context) {
    return reward.maxDuration;
  }

  const modifiers = rewardConditionsArraySchema.safeParse(reward.modifiers);

  if (!modifiers.success) {
    return reward.maxDuration;
  }

  const matchedCondition = evaluateRewardConditions({
    conditions: modifiers.data,
    context,
  });

  if (matchedCondition && matchedCondition.maxDuration !== undefined) {
    return matchedCondition.maxDuration;
  }

  return reward.maxDuration;
};

export const determinePartnerReward = async ({
  event,
  programEnrollment,
  linkId,
  context,
}: {
  event: EventType;
  programEnrollment: ProgramEnrollmentWithReward;
  linkId: string | null; // ID of the link that triggered the event
  context?: RewardContext; // additional reward context (e.g. customer.country, sale.productId, etc.)
}): Promise<DeterminePartnerRewardResult | null> => {
  const rewardEventColumn = REWARD_EVENT_COLUMN_MAPPING[event];

  const linkRewards = await getLinkRewards({
    event,
    linkId,
    programEnrollment,
  });

  let partnerReward =
    linkRewards?.[rewardEventColumn] ?? programEnrollment[rewardEventColumn];

  if (!partnerReward) {
    return null;
  }

  // Add the links metrics to the context
  const partnerLinksStats = aggregatePartnerLinksStats(programEnrollment.links);

  context = {
    ...context,
    partner: {
      ...context?.partner,
      ...partnerLinksStats,
      totalCommissions: toCentsNumber(programEnrollment.totalCommissions),
      country: programEnrollment.partner?.country,
    },
  };

  let matchedCondition: RewardConditions | null = null;

  if (partnerReward.modifiers && context) {
    const modifiers = rewardConditionsArraySchema.safeParse(
      partnerReward.modifiers,
    );

    // Parse the conditions before evaluating them
    if (modifiers.success) {
      matchedCondition = evaluateRewardConditions({
        conditions: modifiers.data,
        context,
      });

      if (matchedCondition) {
        partnerReward = {
          ...partnerReward,
          // Override the reward amount, type and max duration with the matched condition
          type: matchedCondition.type || partnerReward.type,
          amountInCents:
            matchedCondition.amountInCents != null
              ? matchedCondition.amountInCents
              : null,
          amountInPercentage:
            matchedCondition.amountInPercentage != null
              ? new Prisma.Decimal(matchedCondition.amountInPercentage)
              : null,
          maxDuration:
            matchedCondition.maxDuration !== undefined
              ? matchedCondition.maxDuration
              : partnerReward.maxDuration,
        };
      }
    }
  }

  const amount = getRewardAmount(serializeReward(partnerReward));

  if (amount === 0) {
    return null;
  }

  return {
    reward: RewardSchema.parse(partnerReward),
    matchedCondition,
  };
};

// Resolves one or more rewards for a sale: when Stripe line items have a
// productId modifier, returns a reward per product; otherwise a single reward.
export const determinePartnerRewards = async ({
  event,
  programEnrollment,
  context,
  amount,
  quantity,
  linkId,
}: {
  event: EventType;
  programEnrollment: ProgramEnrollmentWithReward;
  context?: RewardContext; // additional reward context (e.g. customer.country, sale.productId, etc.)
  amount: number;
  quantity: number;
  linkId: string | null;
}): Promise<ProductReward[]> => {
  const rewards: ProductReward[] = [];
  const products = context?.sale?.products ?? [];
  let hasProductIdModifier = false;

  if (products.length > 0) {
    let partnerReward = programEnrollment["saleReward"];

    const linkRewards = await getLinkRewards({
      event,
      linkId,
      programEnrollment,
    });

    if (linkRewards?.saleReward) {
      partnerReward = linkRewards.saleReward;
    }

    const modifiers = rewardConditionsArraySchema.safeParse(
      partnerReward?.modifiers,
    );

    if (modifiers.success) {
      hasProductIdModifier = modifiers.data.some((m) =>
        m.conditions.some(
          (c) => c.entity === "sale" && c.attribute === "productId",
        ),
      );
    }
  }

  // If there are products and a productId modifier,
  // we need to calculate the reward for each product (for Stripe integration only)
  if (products.length > 0 && hasProductIdModifier) {
    for (const product of products) {
      const result = await determinePartnerReward({
        event,
        programEnrollment,
        linkId,
        context: {
          ...context,
          sale: {
            ...context?.sale,
            productId: product.id,
            amount: product.amount,
          },
        },
      });

      if (result) {
        // product.amount is the Stripe line total (unit × quantity). Flat
        // rewards are per sale/line, so do not multiply by line.quantity.
        rewards.push({
          reward: result.reward,
          matchedCondition: result.matchedCondition,
          sale: {
            amount: product.amount,
            quantity: 1,
          },
        });
      }
    }
  } else {
    const result = await determinePartnerReward({
      event,
      programEnrollment,
      linkId,
      ...(context ? { context } : {}),
    });

    if (result) {
      rewards.push({
        reward: result.reward,
        matchedCondition: result.matchedCondition,
        sale: {
          amount,
          quantity,
        },
      });
    }
  }

  return rewards;
};

const getLinkRewards = async ({
  event,
  linkId,
  programEnrollment,
}: {
  event: EventType;
  linkId: string | null;
  programEnrollment: ProgramEnrollmentWithReward;
}): Promise<LinkRewards | null> => {
  if (!linkId) {
    return null;
  }

  // Check if the link is part of the program enrollment
  if (!programEnrollment.links?.some((link) => link.id === linkId)) {
    return null;
  }

  const rewardEventColumn = REWARD_EVENT_COLUMN_MAPPING[event];

  return prisma.linkReward.findUnique({
    where: {
      linkId,
    },
    select: {
      [rewardEventColumn]: true,
    },
  });
};
