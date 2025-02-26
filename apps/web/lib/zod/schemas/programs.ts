import { intervals } from "@/lib/analytics/constants";
import { ProgramEnrollmentStatus, ProgramType } from "@dub/prisma/client";
import { z } from "zod";
import { DiscountSchema } from "./discount";
import { LinkSchema } from "./links";
import { RewardSchema } from "./rewards";
import { parseDateSchema } from "./utils";

export const HOLDING_PERIOD_DAYS = [0, 14, 30, 60, 90];

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
  defaultRewardId: z.string().nullable(),
  rewards: z.array(RewardSchema).nullish(),
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
  cookieLength: z.number().min(1).max(180),
  domain: z.string().nullable(),
  url: z.string().nullable(),
  defaultFolderId: z.string().nullable(),
  holdingPeriodDays: z.coerce
    .number()
    .refine((val) => HOLDING_PERIOD_DAYS.includes(val), {
      message: `Holding period must be ${HOLDING_PERIOD_DAYS.join(", ")} days`,
    }),
});

export const ProgramPartnerLinkSchema = LinkSchema.pick({
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
  links: z.array(ProgramPartnerLinkSchema).nullable(),
  reward: RewardSchema.nullish(),
  discount: DiscountSchema.nullish(),
  createdAt: z.date(),
});

export const ProgramInviteSchema = z.object({
  id: z.string(),
  email: z.string(),
  shortLink: z.string(),
  createdAt: z.date(),
});

export const getProgramMetricsQuerySchema = z.object({
  interval: z.enum(intervals).default("30d"),
  start: parseDateSchema.optional(),
  end: parseDateSchema.optional(),
});

export const PartnerProgramInviteSchema = z.object({
  id: z.string(),
  email: z.string(),
  program: ProgramSchema,
  reward: RewardSchema.nullable(),
});
