import { ELIGIBLE_PAYOUTS_MAX_PAGE_SIZE } from "@/lib/constants/payouts";
import { CUTOFF_PERIOD_ENUM } from "@/lib/partners/cutoff-period";
import { PayoutMode, PayoutStatus } from "@dub/prisma/client";
import * as z from "zod/v4";
import { getPaginationQuerySchema } from "./misc";
import { EnrolledPartnerSchema, PartnerSchema } from "./partners";
import { ProgramSchema } from "./programs";
import { UserSchema } from "./users";

export const createManualPayoutSchema = z.object({
  workspaceId: z.string(),
  partnerId: z.string({ error: "Please select a partner" }),
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
    status: z.enum(PayoutStatus).optional(),
    partnerId: z.string().optional(),
    programId: z.string().optional(),
    invoiceId: z.string().optional(),
    eligibility: z.enum(["eligible", "ineligible"]).optional(),
    sortBy: z.enum(["amount", "initiatedAt", "paidAt"]).default("amount"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .extend(getPaginationQuerySchema({ pageSize: PAYOUTS_MAX_PAGE_SIZE }));

export const payoutsCountQuerySchema = payoutsQuerySchema
  .pick({
    status: true,
    programId: true,
    partnerId: true,
    eligibility: true,
    invoiceId: true,
  })
  .extend({
    groupBy: z.enum(["status"]).optional(),
  });

export const PayoutSchema = z.object({
  id: z.string(),
  invoiceId: z.string().nullable(),
  amount: z.number(),
  currency: z.string(),
  status: z.enum(PayoutStatus),
  description: z.string().nullish(),
  periodStart: z.date().nullable(),
  periodEnd: z.date().nullable(),
  createdAt: z.date(),
  initiatedAt: z.date().nullable(),
  paidAt: z.date().nullable(),
  failureReason: z.string().nullish(),
  mode: z.enum(PayoutMode).nullable(),
});

export const PayoutResponseSchema = PayoutSchema.extend({
  partner: PartnerSchema.extend({
    tenantId: z.string().nullable(),
  }),
  user: UserSchema.nullish(),
});

export const PartnerPayoutResponseSchema = PayoutResponseSchema.omit({
  partner: true,
}).extend({
  program: ProgramSchema.pick({
    id: true,
    name: true,
    slug: true,
    logo: true,
    minPayoutAmount: true,
    payoutMode: true,
  }),
  traceId: z.string().nullish(),
});

export const payoutWebhookEventSchema = PayoutSchema.omit({
  failureReason: true,
}).extend({
  partner: EnrolledPartnerSchema.pick({
    id: true,
    name: true,
    email: true,
    image: true,
    country: true,
    tenantId: true,
    status: true,
  }),
});

export const eligiblePayoutsQuerySchema = z
  .object({
    cutoffPeriod: CUTOFF_PERIOD_ENUM,
    selectedPayoutId: z.string().optional(),
  })
  .extend(
    getPaginationQuerySchema({ pageSize: ELIGIBLE_PAYOUTS_MAX_PAGE_SIZE }),
  );

export const eligiblePayoutsCountQuerySchema = eligiblePayoutsQuerySchema
  .extend({
    excludedPayoutIds: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v : v.split(",")))
      .optional(),
  })
  .omit({
    page: true,
    pageSize: true,
  });
