import { PayoutStatus } from "@dub/prisma/client";
import { z } from "zod";
import { getPaginationQuerySchema } from "./misc";
import { PartnerSchema } from "./partners";
import { ProgramSchema } from "./programs";

export const createManualPayoutSchema = z.object({
  workspaceId: z.string(),
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

export const PAYOUTS_MAX_PAGE_SIZE = 100;

export const payoutsQuerySchema = z
  .object({
    status: z.nativeEnum(PayoutStatus).optional(),
    partnerId: z.string().optional(),
    programId: z.string().optional(),
    invoiceId: z.string().optional(),
    eligibility: z.enum(["eligible", "ineligible"]).optional(),
    sortBy: z
      .enum(["createdAt", "periodEnd", "amount", "paidAt"])
      .default("periodEnd"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .merge(getPaginationQuerySchema({ pageSize: PAYOUTS_MAX_PAGE_SIZE }));

export const payoutsCountQuerySchema = payoutsQuerySchema
  .pick({
    status: true,
    programId: true,
    partnerId: true,
    eligibility: true,
    invoiceId: true,
    excludeCurrentMonth: true,
  })
  .merge(
    z.object({
      groupBy: z.enum(["status"]).optional(),
    }),
  );

export const PayoutSchema = z.object({
  id: z.string(),
  invoiceId: z.string().nullable(),
  amount: z.number(),
  currency: z.string(),
  status: z.nativeEnum(PayoutStatus),
  description: z.string().nullish(),
  periodStart: z.date().nullable(),
  periodEnd: z.date().nullable(),
  createdAt: z.date(),
  paidAt: z.date().nullable(),
  failureReason: z.string().nullish(),
});

export const PayoutResponseSchema = PayoutSchema.merge(
  z.object({
    partner: PartnerSchema,
    user: z
      .object({
        id: z.string(),
        name: z.string().nullable(),
        image: z.string().nullable(),
      })
      .nullish(),
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
