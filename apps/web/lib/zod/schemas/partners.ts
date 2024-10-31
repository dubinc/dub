import {
  CommissionType,
  PartnerStatus,
  PayoutStatus,
  ProgramType,
  SaleStatus,
} from "@prisma/client";
import { z } from "zod";
import { LinkSchema } from "./links";

export const PartnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: z.string().nullable(),
  bio: z.string().nullable(),
  country: z.string().nullable(),
  status: z.nativeEnum(PartnerStatus),
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
  recurringDuration: z.number(),
  isLifetimeRecurring: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ProgramEnrollmentSchema = z.object({
  partnerId: z.string(),
  programId: z.string(),
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

export const PayoutSchema = z.object({
  id: z.string(),
  subtotal: z.number(),
  taxes: z.number(),
  total: z.number(),
  payoutFee: z.number(),
  netTotal: z.number(),
  currency: z.string(),
  status: z.nativeEnum(PayoutStatus),
  periodStart: z.date(),
  periodEnd: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const SaleSchema = z.object({
  id: z.string(),
  amount: z.number(),
  // TODO: Include customer object
  status: z.nativeEnum(SaleStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
});
