import { CommissionType, EventType } from "@dub/prisma/client";
import { CursorRays, MoneyBill } from "@dub/ui/icons";
import { UserPlus } from "lucide-react";
import { z } from "zod";
import { getPaginationQuerySchema } from "./misc";

export const RECURRING_MAX_DURATIONS = [0, 3, 6, 12, 18, 24];

export const RewardSchema = z.object({
  id: z.string(),
  event: z.nativeEnum(EventType),
  type: z.nativeEnum(CommissionType),
  amount: z.number(),
  maxDuration: z.number().nullish(),
  partnersCount: z.number().nullish(),
});

export const createOrUpdateRewardSchema = z.object({
  event: z.nativeEnum(EventType),
  type: z.nativeEnum(CommissionType).default("flat"),
  amount: z.number().min(0),
  maxDuration: z.coerce
    .number()
    .refine((val) => RECURRING_MAX_DURATIONS.includes(val), {
      message: `Max duration must be ${RECURRING_MAX_DURATIONS.join(", ")}`,
    })
    .nullish(),
  partnerIds: z.array(z.string()).nullish(),
  workspaceId: z.string(),
  programId: z.string(),
});

export const createRewardSchema = createOrUpdateRewardSchema.superRefine(
  (data) => {
    if (data.event !== EventType.sale) {
      data.maxDuration = 0;
      data.type = "flat";
    }
  },
);

export const updateRewardSchema = createOrUpdateRewardSchema
  .omit({
    event: true,
  })
  .merge(
    z.object({
      rewardId: z.string(),
    }),
  );

export const rewardPartnersQuerySchema = z
  .object({
    rewardId: z.string(),
  })
  .merge(
    getPaginationQuerySchema({
      pageSize: 25,
    }),
  );

export const REWARD_EVENTS = {
  click: {
    icon: CursorRays,
    text: "Click reward",
    event: "click",
    shortcut: "C",
    eventName: "click",
  },
  lead: {
    icon: UserPlus,
    text: "Lead reward",
    event: "lead",
    shortcut: "L",
    eventName: "signup",
  },
  sale: {
    icon: MoneyBill,
    text: "Sale reward",
    event: "sale",
    shortcut: "S",
    eventName: "sale",
  },
} as const;
