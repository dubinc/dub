import { intervals } from "@/lib/analytics/constants";
import {
  CommissionInterval,
  CommissionType,
  ProgramEnrollmentStatus,
  ProgramType,
} from "@dub/prisma/client";
import { z } from "zod";
import { DiscountSchema } from "./discount";
import { LinkSchema } from "./links";
import { parseDateSchema } from "./utils";

export const HOLDING_PERIOD_DAYS = [0, 30, 60, 90];

export const ProgramSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  brandColor: z.string().nullable(),
  domain: z.string().nullable(),
  url: z.string().nullable(),
  type: z.nativeEnum(ProgramType),
  cookieLength: z.number(),
  // Commission details
  commissionAmount: z.number(),
  commissionType: z.nativeEnum(CommissionType),
  commissionDuration: z.number().nullable(),
  commissionInterval: z.nativeEnum(CommissionInterval).nullable(),
  holdingPeriodDays: z.number(),
  // Discounts (for dual-sided incentives)
  discounts: z.array(DiscountSchema).nullish(),
  defaultFolderId: z.string().nullable(),
  wordmark: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createProgramSchema = z.object({
  name: z.string(),
  commissionType: z.nativeEnum(CommissionType),
  commissionAmount: z.number(),
  commissionDuration: z.number().nullable(),
  commissionInterval: z.nativeEnum(CommissionInterval).nullable(),
  holdingPeriodDays: z
    .number()
    .refine((val) => HOLDING_PERIOD_DAYS.includes(val), {
      message: `Holding period must be ${HOLDING_PERIOD_DAYS.join(", ")} days`,
    }),
  cookieLength: z.number().min(1).max(180),
  domain: z.string().nullable(),
  url: z.string().nullable(),
  defaultFolderId: z.string().nullable(),
});

export const PartnerLinkSchema = LinkSchema.pick({
  id: true,
  domain: true,
  key: true,
  shortLink: true,
  url: true,
  clicks: true,
  leads: true,
  sales: true,
  saleAmount: true,
});

export const ProgramEnrollmentSchema = z.object({
  partnerId: z.string(),
  tenantId: z.string().nullable(),
  programId: z.string(),
  program: ProgramSchema,
  status: z.nativeEnum(ProgramEnrollmentStatus),
  links: z.array(PartnerLinkSchema).nullable(),
  discount: DiscountSchema.nullish(),
  commissionAmount: z.number().nullable(),
  createdAt: z.date(),
});

export const ProgramInviteSchema = z.object({
  id: z.string(),
  email: z.string(),
  shortLink: z.string(),
  createdAt: z.date(),
});

export const getProgramMetricsQuerySchema = z.object({
  interval: z.enum(intervals).default("1y"),
  start: parseDateSchema.optional(),
  end: parseDateSchema.optional(),
});

export const PartnerProgramInviteSchema = z.object({
  id: z.string(),
  email: z.string(),
  program: ProgramSchema,
});
