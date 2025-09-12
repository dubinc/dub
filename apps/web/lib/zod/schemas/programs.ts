import {
  DATE_RANGE_INTERVAL_PRESETS,
  DUB_PARTNERS_ANALYTICS_INTERVAL,
} from "@/lib/analytics/constants";
import { ALLOWED_MIN_PAYOUT_AMOUNTS } from "@/lib/partners/constants";
import {
  PartnerBannedReason,
  PartnerLinkStructure,
  ProgramEnrollmentStatus,
} from "@dub/prisma/client";
import { z } from "zod";
import { DiscountSchema } from "./discount";
import { GroupSchema } from "./groups";
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
  linkStructure: z.nativeEnum(PartnerLinkStructure),
  landerPublishedAt: z.date().nullish(),
  autoApprovePartnersEnabledAt: z.date().nullish(),
  rewards: z.array(RewardSchema).nullish(),
  discounts: z.array(DiscountSchema).nullish(),
  defaultFolderId: z.string(),
  defaultGroupId: z.string(),
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
  programId: z.string().describe("The program's unique ID on Dub."),
  groupId: z.string().nullish().describe("The partner's group ID on Dub."), // TODO update to required after migration complete
  partnerId: z.string().describe("The partner's unique ID on Dub."),
  tenantId: z
    .string()
    .nullable()
    .describe(
      "The partner's unique ID within your database. Can be useful for associating the partner with a user in your database and retrieving/update their data in the future.",
    ),
  program: ProgramSchema,
  createdAt: z.date(),
  status: z
    .nativeEnum(ProgramEnrollmentStatus)
    .describe("The status of the partner's enrollment in the program."),
  links: z
    .array(ProgramPartnerLinkSchema)
    .nullable()
    .describe("The partner's referral links in this program."),
  totalCommissions: z.number().default(0),
  rewards: z.array(RewardSchema).nullish(),
  clickRewardId: z.string().nullish(),
  leadRewardId: z.string().nullish(),
  saleRewardId: z.string().nullish(),
  discount: DiscountSchema.nullish(),
  discountId: z.string().nullish(),
  applicationId: z
    .string()
    .nullish()
    .describe(
      "If the partner submitted an application to join the program, this is the ID of the application.",
    ),
  bannedAt: z
    .date()
    .nullish()
    .describe(
      "If the partner was banned from the program, this is the date of the ban.",
    ),
  bannedReason: z
    .enum(Object.keys(PartnerBannedReason) as [PartnerBannedReason])
    .nullish()
    .describe(
      "If the partner was banned from the program, this is the reason for the ban.",
    ),
  group: GroupSchema.pick({
    additionalLinks: true,
    maxPartnerLinks: true,
    linkStructure: true,
  }).nullish(),
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
  groupId: z.string().optional(),
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().min(1).max(100),
  website: z.string().trim().max(100).optional(),
  proposal: z.string().trim().min(1).max(5000),
  comments: z.string().trim().max(5000).optional(),
});
