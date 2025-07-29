import { DATE_RANGE_INTERVAL_PRESETS } from "@/lib/analytics/constants";
import { FraudEventStatus, FraudEventType } from "@dub/prisma/client";
import { z } from "zod";
import { getPaginationQuerySchema } from "./misc";
import { parseDateSchema } from "./utils";

export const FraudEventSchema = z.object({
  id: z.string(),
  partnerId: z.string(),
  customerId: z.string(),
  linkId: z.string().nullable(),
  description: z.string().nullable(),
  type: z.nativeEnum(FraudEventType),
  status: z.nativeEnum(FraudEventStatus),
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
