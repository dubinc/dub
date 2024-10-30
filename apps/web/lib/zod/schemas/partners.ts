import {
  CommissionType,
  PartnerStatus,
  PayoutStatus,
  ProgramType,
} from "@prisma/client";
import { z } from "zod";

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

export const PayoutSchema = z.object({
  id: z.string(),
  subtotal: z.number(),
  taxes: z.number(),
  total: z.number(),
  payoutFee: z.number(),
  netTotal: z.number(),
  currency: z.string(),
  status: z.nativeEnum(PayoutStatus),
  due: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
