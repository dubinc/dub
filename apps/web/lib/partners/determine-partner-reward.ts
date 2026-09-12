import { prettyPrint, toCentsNumber } from "@dub/utils";
import { EventType, Link, Prisma, Reward } from "@prisma/client";
import { serializeReward } from "../api/partners/serialize-reward";
import { prisma } from "../prisma";
import { RewardContext, RewardProps } from "../types";
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
}) => {
  const rewardEventColumn = REWARD_EVENT_COLUMN_MAPPING[event];
  const partnerReward: Reward = programEnrollment[rewardEventColumn];
  let linkRewards: LinkRewards | null = null;

  if (linkId) {
    linkRewards = await prisma.linkReward.findUnique({
      where: {
        linkId,
      },
      select: {
        clickReward: true,
        leadReward: true,
        saleReward: true,
      },
    });
  }

  // Final reward to use
  let eventReward = linkRewards?.[rewardEventColumn] ?? partnerReward;

  if (!eventReward) {
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

  if (eventReward.modifiers && context) {
    const modifiers = rewardConditionsArraySchema.safeParse(
      eventReward.modifiers,
    );

    // Parse the conditions before evaluating them
    if (modifiers.success) {
      const matchedCondition = evaluateRewardConditions({
        conditions: modifiers.data,
        context,
      });

      if (matchedCondition) {
        eventReward = {
          ...eventReward,
          // Override the reward amount, type and max duration with the matched condition
          type: matchedCondition.type || eventReward.type,
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
              : eventReward.maxDuration,
        };
      }
    }
  }

  const amount = getRewardAmount(serializeReward(eventReward));

  if (amount === 0) {
    return null;
  }

  return RewardSchema.parse(eventReward);
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
  const modifiers = rewardConditionsArraySchema.safeParse(
    programEnrollment.saleReward?.modifiers,
  );

  const hasProductIdModifier = modifiers.success
    ? modifiers.data.some((m) =>
        m.conditions.some(
          (c) => c.entity === "sale" && c.attribute === "productId",
        ),
      )
    : false;

  // If there are products and a productId modifier,
  // we need to calculate the reward for each product (for Stripe integration only)
  if (products.length > 0 && hasProductIdModifier) {
    for (const product of products) {
      const reward = await determinePartnerReward({
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

      if (reward) {
        // product.amount is the Stripe line total (unit × quantity). Flat
        // rewards are per sale/line, so do not multiply by line.quantity.
        rewards.push({
          reward,
          sale: {
            amount: product.amount,
            quantity: 1,
          },
        });
      }
    }
  } else {
    const reward = await determinePartnerReward({
      event,
      programEnrollment,
      linkId,
      ...(context ? { context } : {}),
    });

    if (reward) {
      rewards.push({
        reward,
        sale: {
          amount,
          quantity,
        },
      });
    }
  }

  console.log("Reward context", prettyPrint(context));

  return rewards;
};
