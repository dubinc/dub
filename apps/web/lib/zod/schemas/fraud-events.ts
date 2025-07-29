import { DATE_RANGE_INTERVAL_PRESETS } from "@/lib/analytics/constants";
import { FraudEventStatus, FraudEventType } from "@dub/prisma/client";
import { z } from "zod";
import { CustomerSchema } from "./customers";
import { getPaginationQuerySchema } from "./misc";
import { PartnerSchema } from "./partners";
import { parseDateSchema } from "./utils";

export const FRAUD_EVENT_TYPE_DESCRIPTIONS = {
  selfReferral: "Self referral",
  googleAdsClick: "Google ads click",
  disposableEmail: "Disposable email",
} as const;

export const FraudEventSchema = z.object({
  id: z.string(),
  partner: PartnerSchema.pick({
    id: true,
    name: true,
    email: true,
    image: true,
    payoutsEnabledAt: true,
  }),
  customer: CustomerSchema.pick({
    id: true,
    name: true,
    email: true,
    avatar: true,
  }).nullable(),
  linkId: z.string().nullable(),
  description: z.string().nullable(),
  type: z.nativeEnum(FraudEventType),
  status: z.nativeEnum(FraudEventStatus),
  holdAmount: z.number().nullish(), // TODO: Fix it
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const getFraudEventsQuerySchema = z
  .object({
    status: z.nativeEnum(FraudEventStatus).optional(),
    type: z.nativeEnum(FraudEventType).optional(),
    interval: z.enum(DATE_RANGE_INTERVAL_PRESETS).default("all"),
    start: parseDateSchema.optional(),
    end: parseDateSchema.optional(),
  })
  .merge(
    getPaginationQuerySchema({
      pageSize: 50,
    }),
  );

export const fraudEventsCountQuerySchema = getFraudEventsQuerySchema
  .pick({
    status: true,
    type: true,
    interval: true,
    start: true,
    end: true,
  })
  .extend({
    groupBy: z.enum(["status", "type"]).optional(),
  });
