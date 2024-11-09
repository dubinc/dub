import {
  CommissionInterval,
  CommissionType,
  PartnerStatus,
  PayoutStatus,
  ProgramEnrollmentStatus,
  ProgramType,
  SaleStatus,
} from "@prisma/client";
import { z } from "zod";
import { LinkSchema } from "./links";
import { getPaginationQuerySchema } from "./misc";

export const partnersQuerySchema = z
  .object({
    status: z.nativeEnum(ProgramEnrollmentStatus).optional(),
    country: z.string().optional(),
    search: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    sortBy: z.enum(["createdAt", "earnings"]).default("createdAt"),
  })
  .merge(getPaginationQuerySchema({ pageSize: 100 }));

export const PartnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: z.string().nullable(),
  bio: z.string().nullable(),
  country: z.string().nullable(),
  status: z.nativeEnum(PartnerStatus),
  dotsUserId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ProgramSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  type: z.nativeEnum(ProgramType),
  cookieLength: z.number(),
  minimumPayout: z.number(),
  commissionAmount: z.number(),
  commissionType: z.nativeEnum(CommissionType),
  recurringCommission: z.boolean(),
  recurringDuration: z.number().nullable(),
  recurringInterval: z.nativeEnum(CommissionInterval).nullable(),
  isLifetimeRecurring: z.boolean().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ProgramEnrollmentSchema = z.object({
  partnerId: z.string(),
  programId: z.string(),
  program: ProgramSchema,
  link: LinkSchema.pick({
    id: true,
    shortLink: true,
    url: true,
    clicks: true,
    leads: true,
    sales: true,
    saleAmount: true,
  }).nullable(),
});

export const EnrolledPartnerSchema = PartnerSchema.merge(
  ProgramEnrollmentSchema,
)
  .omit({
    program: true,
  })
  .extend({
    earnings: z.number(),
  });

export const payoutsQuerySchema = z
  .object({
    status: z.nativeEnum(PayoutStatus).optional(),
    search: z.string().optional(),
    order: z.enum(["asc", "desc"]).default("desc"),
    sortBy: z.enum(["periodStart", "total"]).default("periodStart"),
  })
  .merge(getPaginationQuerySchema({ pageSize: 100 }));

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

export const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  avatar: z.string().nullable(),
  externalId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SaleSchema = z.object({
  id: z.string(),
  amount: z.number(),
  commissionEarned: z.number(),
  currency: z.string(),
  status: z.nativeEnum(SaleStatus),
  program: ProgramSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});
