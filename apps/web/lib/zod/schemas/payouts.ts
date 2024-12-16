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
  start: parseDateSchema.optional(),
  end: parseDateSchema.optional(),
  amount: z.preprocess(
    (val) => parseFloat(val as string),
    z.number().default(0),
  ),
  type: z.nativeEnum(PayoutType),
  description: z
    .string()
    .max(190, "Description must be less than 190 characters")
    .nullable(),
});

export const payoutsQuerySchema = z
  .object({
    status: z.nativeEnum(PayoutStatus).optional(),
    partnerId: z.string().optional(),
    invoiceId: z.string().optional(),
    sortBy: z.enum(["periodStart", "total"]).default("periodStart"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    type: z.nativeEnum(PayoutType).optional(),
  })
  .merge(getPaginationQuerySchema({ pageSize: PAYOUTS_MAX_PAGE_SIZE }));

export const payoutsCountQuerySchema = z.object({
  partnerId: z.string().optional(),
  groupBy: z.enum(["status"]).optional(),
});

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
  updatedAt: z.date(),
});

export const PayoutResponseSchema = PayoutSchema.merge(
  z.object({
    partner: PartnerSchema,
    _count: z.object({ sales: z.number() }),
  }),
);

export const PartnerPayoutResponseSchema = PayoutResponseSchema.omit({
  partner: true,
}).merge(
  z.object({
    program: ProgramSchema.pick({
      id: true,
      name: true,
      slug: true,
      logo: true,
    }),
  }),
);
