import { AIRewardDraft } from "@/lib/ai/ai-reward-schema";
import { EventType } from "@prisma/client";

export type RewardPreset = {
  id: string;
  label: string;
  draft: AIRewardDraft;
};

export const REWARD_PRESETS: Partial<
  Record<Exclude<EventType, "referral" | "custom">, RewardPreset[]>
> = {
  sale: [
    {
      id: "sale-30-12-months",
      label: "30% for 12 months",
      draft: {
        type: "percentage",
        amount: 30,
        maxDuration: 12,
      },
    },
    {
      id: "sale-100-cpa",
      label: "$100 CPA",
      draft: {
        type: "flat",
        amount: 100,
        maxDuration: 0,
      },
    },
  ],
  lead: [
    {
      id: "lead-10-flat",
      label: "$10 per lead",
      draft: {
        type: "flat",
        amount: 10,
        maxDuration: 0,
      },
    },
    {
      id: "lead-trial-25",
      label: "$25 for trial leads",
      draft: {
        type: "flat",
        amount: 10,
        maxDuration: 0,
        modifiers: [
          {
            operator: "AND",
            conditions: [
              {
                entity: "customer",
                attribute: "source",
                operator: "equals_to",
                value: "trial",
              },
            ],
            type: "flat",
            amount: 25,
          },
        ],
      },
    },
  ],
  click: [
    {
      id: "click-050",
      label: "$0.50 per click",
      draft: {
        type: "flat",
        amount: 0.5,
        maxDuration: 0,
      },
    },
    {
      id: "click-non-us",
      label: "$1 for non-US traffic",
      draft: {
        type: "flat",
        amount: 0.5,
        maxDuration: 0,
        modifiers: [
          {
            operator: "AND",
            conditions: [
              {
                entity: "customer",
                attribute: "country",
                operator: "not_equals",
                value: "US",
              },
            ],
            type: "flat",
            amount: 1,
          },
        ],
      },
    },
  ],
};
