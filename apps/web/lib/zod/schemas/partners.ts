import { intervals } from "@/lib/analytics/constants";
import { COUNTRY_CODES } from "@dub/utils";
import {
  PartnerStatus,
  PayoutStatus,
  ProgramEnrollmentStatus,
  SaleStatus,
} from "@prisma/client";
import { z } from "zod";
import { CustomerSchema } from "./customers";
import { getPaginationQuerySchema } from "./misc";
import { ProgramEnrollmentSchema } from "./programs";
import { parseDateSchema } from "./utils";

export const PARTNERS_MAX_PAGE_SIZE = 100;

export const partnersQuerySchema = z
  .object({
    status: z.nativeEnum(ProgramEnrollmentStatus).optional(),
    country: z.string().optional(),
    search: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    sortBy: z.enum(["createdAt", "earnings"]).default("createdAt"),
    ids: z
      .union([z.string(), z.array(z.string())])
      .transform((v) => (Array.isArray(v) ? v : v.split(",")))
      .optional()
      .describe("IDs of partners to filter by."),
  })
  .merge(getPaginationQuerySchema({ pageSize: PARTNERS_MAX_PAGE_SIZE }));

export const PartnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.string().nullable(),
  bio: z.string().nullable(),
  country: z.string().nullable(),
  status: z.nativeEnum(PartnerStatus),
  dotsUserId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const EnrolledPartnerSchema = PartnerSchema.omit({
  status: true,
})
  .merge(ProgramEnrollmentSchema)
  .omit({
    program: true,
  })
  .extend({
    earnings: z.number(),
  });

export const PAYOUTS_MAX_PAGE_SIZE = 100;

export const payoutsQuerySchema = z
  .object({
    status: z.nativeEnum(PayoutStatus).optional(),
    search: z.string().optional(),
    partnerId: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    sortBy: z.enum(["periodStart", "total"]).default("periodStart"),
  })
  .merge(getPaginationQuerySchema({ pageSize: PAYOUTS_MAX_PAGE_SIZE }));

export const PayoutSchema = z.object({
  id: z.string(),
  amount: z.number(),
  fee: z.number(),
  total: z.number(),
  currency: z.string(),
  status: z.nativeEnum(PayoutStatus),
  periodStart: z.date(),
  periodEnd: z.date(),
  dotsTransferId: z.string().nullable(),
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
  fee: true,
  total: true,
});

export const SaleSchema = z.object({
  id: z.string(),
  amount: z.number(),
  earnings: z.number(),
  currency: z.string(),
  status: z.nativeEnum(SaleStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const getSalesQuerySchema = z
  .object({
    status: z.nativeEnum(SaleStatus).optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    sortBy: z.enum(["createdAt", "amount"]).default("createdAt"),
    interval: z.enum(intervals).default("30d"),
    start: parseDateSchema.optional(),
    end: parseDateSchema.optional(),
    customerId: z.string().optional(),
    payoutId: z.string().optional(),
    partnerId: z.string().optional(),
  })
  .merge(getPaginationQuerySchema({ pageSize: 100 }));

export const SaleResponseSchema = SaleSchema.merge(
  z.object({
    customer: CustomerSchema,
    partner: PartnerSchema,
  }),
);

export const getSalesCountQuerySchema = getSalesQuerySchema.omit({
  page: true,
  pageSize: true,
  order: true,
  sortBy: true,
});

export const getPartnerSalesQuerySchema = getSalesQuerySchema.omit({
  partnerId: true,
});

export const PartnerSaleResponseSchema = SaleResponseSchema.omit({
  partner: true,
  customer: true,
}).merge(
  z.object({
    customer: z.object({
      email: z
        .string()
        .transform((email) => email.replace(/(?<=^.).+(?=.@)/, "********")),
      avatar: z.string().nullable(),
    }),
  }),
);

export const getPartnerSalesCountQuerySchema = getSalesCountQuerySchema.omit({
  partnerId: true,
});

export const onboardPartnerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  image: z.string(),
  country: z.enum(COUNTRY_CODES),
  phoneNumber: z.string().trim().min(1).max(24),
  description: z.string().max(5000).nullable(),
});
