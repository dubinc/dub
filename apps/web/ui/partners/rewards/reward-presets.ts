import { AIRewardDraft } from "@/lib/ai/ai-reward-schema";
import { EventType } from "@prisma/client";

export type RewardPreset = {
  id: string;
  label: string;
  draft: AIRewardDraft;
};

export const REWARD_PRESETS: Partial<
  Record<Exclude<EventType, "referral">, RewardPreset[]>
> = {
  sale: [
    {
      id: "sale-20-lifetime",
      label: "20% lifetime",
      draft: {
        type: "percentage",
        amount: 20,
        maxDuration: null,
      },
    },
    {
      id: "sale-new-vs-recurring",
      label: "10% new / 5% recurring",
      draft: {
        type: "percentage",
        amount: 5,
        maxDuration: null,
        modifiers: [
          {
            operator: "AND",
            conditions: [
              {
                entity: "sale",
                attribute: "type",
                operator: "equals_to",
                value: "new",
              },
            ],
            type: "percentage",
            amount: 10,
            maxDuration: null,
          },
        ],
      },
    },
    {
      id: "sale-us-flat",
      label: "$50 for US customers",
      draft: {
        type: "flat",
        amount: 0,
        maxDuration: null,
        modifiers: [
          {
            operator: "AND",
            conditions: [
              {
                entity: "customer",
                attribute: "country",
                operator: "equals_to",
                value: "US",
              },
            ],
            type: "flat",
            amount: 50,
            maxDuration: null,
          },
        ],
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
