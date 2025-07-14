import {
  DATE_RANGE_INTERVAL_PRESETS,
  DUB_PARTNERS_ANALYTICS_INTERVAL,
} from "@/lib/analytics/constants";
import { ALLOWED_MIN_PAYOUT_AMOUNTS } from "@/lib/partners/constants";
import { LinkStructure, ProgramEnrollmentStatus } from "@dub/prisma/client";
import { z } from "zod";
import { DiscountSchema } from "./discount";
import { LinkSchema } from "./links";
import { programLanderSchema } from "./program-lander";
import { RewardSchema } from "./rewards";
import { parseDateSchema } from "./utils";

export const HOLDING_PERIOD_DAYS = [0, 7, 14, 30, 60, 90];

export const ProgramSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  logo: z.string().nullable(),
  brandColor: z.string().nullable(),
  domain: z.string().nullable(),
  url: z.string().nullable(),
  cookieLength: z.number(),
  holdingPeriodDays: z.number(),
  minPayoutAmount: z.number(),
  linkStructure: z.nativeEnum(LinkStructure),
  linkParameter: z.string().nullish(),
  landerPublishedAt: z.date().nullish(),
  autoApprovePartnersEnabledAt: z.date().nullish(),
  rewards: z.array(RewardSchema).nullish(),
  discounts: z.array(DiscountSchema).nullish(),
  defaultFolderId: z.string().nullable(),
  wordmark: z.string().nullable(),
  supportEmail: z.string().nullish(),
  helpUrl: z.string().nullish(),
  termsUrl: z.string().nullish(),
  ageVerification: z.number().nullish(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ProgramWithLanderDataSchema = ProgramSchema.extend({
  landerData: programLanderSchema.nullish(),
  landerPublishedAt: z.date().nullish(),
});

export const updateProgramSchema = z.object({
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
  minPayoutAmount: z.coerce
    .number()
    .refine((val) => ALLOWED_MIN_PAYOUT_AMOUNTS.includes(val), {
      message: `Minimum payout amount must be one of ${ALLOWED_MIN_PAYOUT_AMOUNTS.join(", ")}`,
    }),
  linkStructure: z.nativeEnum(LinkStructure),
  supportEmail: z.string().email().max(255).nullish(),
  helpUrl: z.string().url().max(500).nullish(),
  termsUrl: z.string().url().max(500).nullish(),
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
  partnerId: z.string().describe("The partner's unique ID on Dub."),
  tenantId: z
    .string()
    .nullable()
    .describe(
      "The partner's unique ID within your database. Can be useful for associating the partner with a user in your database and retrieving/update their data in the future.",
    ),
  programId: z.string().describe("The program's unique ID on Dub."),
  program: ProgramSchema,
  status: z
    .nativeEnum(ProgramEnrollmentStatus)
    .describe("The status of the partner's enrollment in the program."),
  links: z
    .array(ProgramPartnerLinkSchema)
    .nullable()
    .describe("The partner's referral links in this program."),
  totalCommissions: z.number().default(0),
  rewards: z.array(RewardSchema).nullish(),
  discount: DiscountSchema.nullish(),
  createdAt: z.date(),
});

export const ProgramInviteSchema = z.object({
  id: z.string(),
  email: z.string(),
  shortLink: z.string(),
  createdAt: z.date(),
});

export const getProgramQuerySchema = z.object({
  includeLanderData: z.coerce.boolean().optional(),
});

export const getProgramMetricsQuerySchema = z.object({
  interval: z
    .enum(DATE_RANGE_INTERVAL_PRESETS)
    .default(DUB_PARTNERS_ANALYTICS_INTERVAL),
  start: parseDateSchema.optional(),
  end: parseDateSchema.optional(),
});

export const PartnerProgramInviteSchema = z.object({
  id: z.string(),
  email: z.string(),
  program: ProgramSchema,
  reward: RewardSchema.nullable(),
});

export const ProgramMetricsSchema = z.object({
  partnersCount: z.number(),
  commissionsCount: z.number(),
  commissions: z.number(),
  payouts: z.number(),
});

export const createProgramApplicationSchema = z.object({
  programId: z.string(),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().min(1).max(100),
  website: z.string().trim().max(100).optional(),
  proposal: z.string().trim().min(1).max(5000),
  comments: z.string().trim().max(5000).optional(),
});
