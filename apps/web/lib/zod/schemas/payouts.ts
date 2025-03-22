import { intervals } from "@/lib/analytics/constants";
import { parseDateSchema } from "@/lib/zod/schemas/utils";
import { PayoutStatus, PayoutType } from "@dub/prisma/client";
import { z } from "zod";
import { getPaginationQuerySchema } from "./misc";
import { PartnerSchema, PAYOUTS_MAX_PAGE_SIZE } from "./partners";
import { ProgramSchema } from "./programs";

export const createManualPayoutSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  partnerId: z.string({ required_error: "Please select a partner" }),
  amount: z
    .preprocess((val) => {
      const parsed = parseFloat(val as string);
      return isNaN(parsed) ? 0 : parsed;
    }, z.number())
    .optional(),
  description: z
    .string()
    .max(190, "Description must be less than 190 characters")
    .nullable(),
});

export const payoutsQuerySchema = z
  .object({
    status: z.nativeEnum(PayoutStatus).optional(),
    partnerId: z.string().optional(),
    programId: z.string().optional(),
    invoiceId: z.string().optional(),
    sortBy: z
      .enum(["createdAt", "periodStart", "amount", "paidAt"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    type: z.nativeEnum(PayoutType).optional(),
    interval: z.enum(intervals).default("all"),
    start: parseDateSchema.optional(),
    end: parseDateSchema.optional(),
  })
  .merge(getPaginationQuerySchema({ pageSize: PAYOUTS_MAX_PAGE_SIZE }));

export const payoutsCountQuerySchema = payoutsQuerySchema
  .pick({
    status: true,
    programId: true,
    partnerId: true,
    interval: true,
    start: true,
    end: true,
  })
  .merge(
    z.object({
      groupBy: z.enum(["status"]).optional(),
      eligibility: z.enum(["eligible"]).optional(),
    }),
  );

export const PayoutSchema = z.object({
  id: z.string(),
  invoiceId: z.string().nullable(),
  amount: z.number(),
  currency: z.string(),
  status: z.nativeEnum(PayoutStatus),
  type: z.nativeEnum(PayoutType),
  description: z.string().nullish(),
  periodStart: z.date().nullable(),
  periodEnd: z.date().nullable(),
  quantity: z.number().nullable(),
  createdAt: z.date(),
  paidAt: z.date().nullable(),
});

export const PayoutResponseSchema = PayoutSchema.merge(
  z.object({
    partner: PartnerSchema,
    _count: z.object({ commissions: z.number() }),
  }),
);

export const PartnerPayoutResponseSchema = PayoutResponseSchema.omit({
  partner: true,
  _count: true,
}).merge(
  z.object({
    program: ProgramSchema.pick({
      id: true,
      name: true,
      slug: true,
      logo: true,
      minPayoutAmount: true,
    }),
  }),
);
