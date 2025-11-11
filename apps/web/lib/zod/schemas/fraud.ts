import { FraudEventStatus, FraudRiskLevel } from "@dub/prisma/client";
import { z } from "zod";
import { getPaginationQuerySchema } from "./misc";

export const FRAUD_EVENTS_MAX_PAGE_SIZE = 100;

export const FraudEventSchema = z.object({
  id: z.string(),
  programId: z.string(),
  partnerId: z.string(),
  linkId: z.string().nullable(),
  customerId: z.string().nullable(),
  eventId: z.string().nullable(),
  eventType: z.string().nullable(),
  riskLevel: z.nativeEnum(FraudRiskLevel),
  riskScore: z.number(),
  triggeredRules: z.any(), // JSON field
  userId: z.string().nullable(),
  resolutionReason: z.string().nullable(),
  resolvedAt: z.date().nullable(),
  status: z.nativeEnum(FraudEventStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
  partner: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
    })
    .optional(),
  customer: z
    .object({
      id: z.string(),
      name: z.string().nullable(),
      email: z.string().nullable(),
    })
    .nullable()
    .optional(),
  link: z
    .object({
      id: z.string(),
      key: z.string(),
      domain: z.string(),
    })
    .nullable()
    .optional(),
});

export const FraudEventListQuerySchema = z
  .object({
    status: z
      .nativeEnum(FraudEventStatus)
      .optional()
      .describe("Filter fraud events by status."),
    riskLevel: z
      .nativeEnum(FraudRiskLevel)
      .optional()
      .describe("Filter fraud events by risk level."),
    partnerId: z
      .string()
      .optional()
      .describe("Filter fraud events by partner ID."),
    sortBy: z
      .enum(["createdAt", "riskScore", "riskLevel"])
      .default("createdAt")
      .describe("The field to sort the fraud events by."),
    sortOrder: z
      .enum(["asc", "desc"])
      .default("desc")
      .describe("The sort order."),
  })
  .merge(getPaginationQuerySchema({ pageSize: FRAUD_EVENTS_MAX_PAGE_SIZE }));

export const ResolveFraudEventSchema = z.object({
  status: z
    .enum(["safe", "banned"])
    .describe("The resolution status for the fraud event."),
  resolutionReason: z
    .string()
    .optional()
    .describe("Optional notes explaining the resolution."),
});

