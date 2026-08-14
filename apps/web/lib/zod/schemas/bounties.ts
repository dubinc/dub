import {
  BOUNTY_DESCRIPTION_MAX_LENGTH,
  BOUNTY_MAX_SUBMISSION_DESCRIPTION_LENGTH,
  BOUNTY_MAX_SUBMISSION_FILES,
  BOUNTY_MAX_SUBMISSION_REJECTION_NOTE_LENGTH,
  BOUNTY_MAX_SUBMISSION_URLS,
  BOUNTY_MAX_SUBMISSIONS,
} from "@/lib/bounty/constants";
import {
  BOUNTY_SOCIAL_PLATFORM_METRICS,
  BOUNTY_SOCIAL_PLATFORM_VALUES,
} from "@/lib/bounty/social-content";
import {
  BountyPerformanceScope,
  BountyStartMode,
  BountySubmissionFrequency,
  BountySubmissionRejectionReason,
  BountySubmissionStatus,
  BountyType,
} from "@prisma/client";
import * as z from "zod/v4";
import { awardBountyConditionSchema } from "../../api/workflows/award-bounty/schema";
import { CommissionSchema } from "./commissions";
import { GroupSchema } from "./groups";
import { booleanQuerySchema, getPaginationQuerySchema } from "./misc";
import { EnrolledPartnerSchema } from "./partners";
import { UserSchema } from "./users";
import { nullableCountSchema, parseDateSchema } from "./utils";

// Eg: for each additional 1000 views, earn $1, up to $100
export const bountySocialContentIncrementalBonusSchema = z
  .object({
    incrementCount: z.number().int().positive().optional(),
    bonusPerIncrement: z.number().min(0).optional(),
    maxCount: z.number().int().positive().optional(),
  })
  .refine(
    ({ incrementCount, maxCount }) => {
      if (
        incrementCount != null &&
        maxCount != null &&
        !Number.isNaN(incrementCount) &&
        !Number.isNaN(maxCount)
      ) {
        return maxCount >= incrementCount;
      }

      return true;
    },
    {
      message: "Cap must be at least the increment count",
      path: ["maxCount"],
    },
  );

export const bountySocialContentRequirementsSchema = z.object({
  platform: z.enum(BOUNTY_SOCIAL_PLATFORM_VALUES),
  metric: z.enum(BOUNTY_SOCIAL_PLATFORM_METRICS),
  minCount: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Minimum metric required for eligibility"),
  incrementalBonus: bountySocialContentIncrementalBonusSchema.optional(),
});

export const submissionRequirementsSchema = z.object({
  image: z
    .object({
      max: z.number().int().positive().optional(),
    })
    .optional(),
  url: z
    .object({
      max: z.number().int().positive().optional(),
      domains: z.array(z.string()).optional(),
    })
    .optional(),
  socialMetrics: bountySocialContentRequirementsSchema.optional(),
});

export const createBountySchema = z.object({
  name: z
    .string()
    .trim()
    .max(100, "Name must be less than 100 characters")
    .nullish()
    .describe(
      "The name of the bounty. E.g.: `June Product Launch Promo`. Only applicable for `submission` bounties.",
    ),
  description: z
    .string()
    .trim()
    .max(
      BOUNTY_DESCRIPTION_MAX_LENGTH,
      `Description must be less than ${BOUNTY_DESCRIPTION_MAX_LENGTH} characters`,
    )
    .nullish()
    .describe(
      "The description of the bounty. Use this field to outline the rules and requirements for the bounty.",
    ),
  type: z
    .enum(BountyType)
    .describe(
      [
        "The type of bounty.",
        "`performance`: Bounties that are awarded based on partner performance (leads, conversions, revenue, commissions).",
        "`submission`: Bounties that are awarded based on partner submissions (can be an arbitrary submission or a social content submission).",
      ].join("\n"),
    ),
  startMode: z
    .enum(BountyStartMode)
    .optional()
    .describe(
      [
        "How the bounty's start date is determined.",
        "`absolute`: Bounty starts at a specific date and time.",
        "`relative`: Bounty starts when a partner joins the program.",
      ].join("\n"),
    ),
  startsAt: parseDateSchema
    .nullish()
    .describe(
      "The date and time the bounty starts. Only applicable when `startMode` is absolute.",
    ),
  endsAt: parseDateSchema
    .nullish()
    .describe(
      "The date and time the bounty ends. Only applicable when `startMode` is absolute.",
    ),
  endsAfterDays: z
    .number()
    .int()
    .positive()
    .nullish()
    .describe(
      "How long after a partner joins the program is the bounty open for. Only applicable when `startMode` is relative.",
    ),
  submissionsOpenAt: parseDateSchema
    .nullish()
    .describe(
      "The date and time after which partners can finalize their bounty submissions. Only applicable for `submission` bounties.",
    ),
  maxSubmissions: z
    .number()
    .int()
    .min(2, "If `maxSubmissions` is set, it must be at least 2")
    .max(BOUNTY_MAX_SUBMISSIONS)
    .nullish()
    .describe(
      "The maximum number of submissions a partner can enter. Only applicable for `submission` bounties.",
    ),
  submissionFrequency: z
    .enum(BountySubmissionFrequency)
    .nullish()
    .describe(
      [
        "How often partners can submit their bounty submissions.",
        "`daily`: Partners can submit their bounty submissions once per day.",
        "`weekly`: Partners can submit their bounty submissions once per week.",
        "`monthly`: Partners can submit their bounty submissions once per month.",
        "Only applicable for bounties that have `maxSubmissions` set.",
      ].join("\n"),
    ),
  rewardAmount: z
    .number()
    .positive()
    .min(1, "Reward amount must be greater than 1")
    .nullable()
    .describe("The reward amount for the bounty in USD cents."),
  rewardDescription: z
    .string()
    .trim()
    .max(100, "Reward description must be less than 100 characters")
    .transform((v) => (v === "" ? null : v))
    .nullish()
    .describe(
      "The reward description for `submission` bounties if a custom reward amount is set",
    ),
  performanceCondition: awardBountyConditionSchema
    .nullish()
    .describe(
      "The condition that must be met for a `performance` bounty to be awarded. Only applicable for `performance` bounties.",
    ),
  performanceScope: z
    .enum(BountyPerformanceScope)
    .nullish()
    .describe(
      [
        "The scpoe of the performance criteria:",
        "`lifetime`: Bounty takes into account all-time performance data",
        "`new`: Bounty only counts performance data after the bounty starts",
      ].join("\n"),
    ),
  submissionRequirements: submissionRequirementsSchema
    .nullish()
    .describe(
      "The requirements that must be met for a bounty submission to be finalized. Only applicable for `submission` bounties.",
    ),
  groupIds: z
    .array(z.string())
    .nullable()
    .describe("The IDs of the partner groups that this bounty is available to"),
  sendNotificationEmails: z
    .boolean()
    .optional()
    .describe(
      "Whether to send notification emails to partners when the bounty is created.",
    ),
});

export const updateBountySchema = createBountySchema
  .omit({
    // omit fields that cannot be updated after creation
    type: true,
    performanceScope: true,
  })
  .partial();

export const BountySubmissionFileSchema = z.object({
  url: z.httpUrl().describe("The URL of the uploaded file."),
  fileName: z.string().describe("The original file name."),
  size: z.number().describe("The file size in bytes."),
});

// used in POST, PATCH, DELETE /bounties + bounty.created, bounty.updated webhooks
export const BountySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  type: z.enum(BountyType),
  startsAt: z.date().nullable(),
  endsAt: z.date().nullable(),
  startMode: z.enum(BountyStartMode),
  endsAfterDays: z.number().nullable(),
  submissionsOpenAt: z.date().nullable(),
  submissionFrequency: z.enum(BountySubmissionFrequency).nullable(),
  maxSubmissions: z.number(),
  rewardAmount: z.number().nullable(),
  rewardDescription: z.string().nullable(),
  performanceCondition: awardBountyConditionSchema.nullable().default(null),
  performanceScope: z.enum(BountyPerformanceScope).nullable(),
  submissionRequirements: submissionRequirementsSchema.nullable().default(null),
  socialMetricsLastSyncedAt: z.date().nullable().optional(),
  groups: z.array(GroupSchema.pick({ id: true })),
});

export const getBountiesQuerySchema = z.object({
  partnerId: z.string().optional(),
  includeSubmissionsCount: booleanQuerySchema.optional().default(false),
});

// used in GET /bounties
export const BountyListSchema = BountySchema.extend({
  submissionsCountData: z
    .object({
      total: z.number().default(0),
      submitted: z.number().default(0),
      approved: z.number().default(0),
    })
    .optional(),
});

// used in GET /bounties/{bountyId}/submissions
export const BountySubmissionSchema = z.object({
  id: z.string().meta({ description: "The ID of the bounty submission" }),
  bountyId: z.string().meta({ description: "The ID of the bounty" }),
  partnerId: z.string().meta({ description: "The ID of the partner" }),
  description: z
    .string()
    .nullable()
    .meta({ description: "The description of the submission" }),
  urls: z
    .array(z.string())
    .nullable()
    .meta({ description: "The URLs submitted for the submission" }),
  files: z
    .array(BountySubmissionFileSchema)
    .nullable()
    .meta({ description: "The files uploaded for the submission" }),
  status: z
    .enum(BountySubmissionStatus)
    .meta({ description: "The status of the submission" }),
  performanceCount: nullableCountSchema.meta({
    description: "The performance count of the submission",
  }),
  socialMetricCount: z.number().int().nullable().meta({
    description:
      "The social metric count (views or likes) for the social content",
  }),
  socialMetricsLastSyncedAt: z.date().nullable().optional().meta({
    description:
      "The date and time the submission's social metrics were last synced",
  }),
  createdAt: z
    .date()
    .meta({ description: "The date and time the submission was created" }),
  completedAt: z
    .date()
    .nullable()
    .meta({ description: "The date and time the submission was completed" }),
  reviewedAt: z
    .date()
    .nullable()
    .meta({ description: "The date and time the submission was reviewed" }),
  rejectionReason: z
    .string()
    .nullable()
    .meta({ description: "The reason for rejecting the submission" }),
  rejectionNote: z
    .string()
    .nullable()
    .meta({ description: "The note for rejecting the submission" }),
  periodNumber: z.number().int().min(1).meta({
    description: "The period number for this submission (1-indexed)",
  }),
});

export const BountySubmissionExtendedSchema = BountySubmissionSchema.extend({
  partner: EnrolledPartnerSchema.pick({
    id: true,
    name: true,
    email: true,
    image: true,
    country: true,
    payoutsEnabledAt: true,
    groupId: true,
    status: true,
    bannedAt: true,
    bannedReason: true,
  }),
  commission: CommissionSchema.pick({
    id: true,
    amount: true,
    earnings: true,
    status: true,
    createdAt: true,
  }).nullable(),
  user: UserSchema.pick({
    id: true,
    name: true,
    image: true,
  }).nullable(),
});

export const approveBountySubmissionBodySchema = z.object({
  rewardAmount: z.number().nullish().meta({
    description:
      "The reward amount for the performance-based bounty. Applicable if the bounty reward amount is not set.",
  }),
});

export const rejectBountySubmissionBodySchema = z.object({
  rejectionReason: z.enum(BountySubmissionRejectionReason).optional().meta({
    description: "The reason for rejecting the submission.",
  }),
  rejectionNote: z
    .string()
    .trim()
    .max(BOUNTY_MAX_SUBMISSION_REJECTION_NOTE_LENGTH)
    .optional()
    .meta({
      description: "The note for rejecting the submission.",
    }),
});

export const getBountySubmissionsQuerySchema = z
  .object({
    status: z.enum(BountySubmissionStatus).optional().meta({
      description: "The status of the submissions to list.",
    }),
    groupId: z.string().optional().meta({
      description: "The ID of the group to list submissions for.",
    }),
    partnerId: z.string().optional().meta({
      description: "The ID of the partner to list submissions for.",
    }),
    sortBy: z
      .enum(["completedAt", "performanceCount", "socialMetricCount"])
      .default("completedAt")
      .meta({
        description: "The field to sort the submissions by.",
      }),
    sortOrder: z.enum(["asc", "desc"]).default("asc").meta({
      description: "The order to sort the submissions by.",
    }),
  })
  .extend(getPaginationQuerySchema({ pageSize: 100 }));

export const socialContentOutputSchema = z.object({
  likes: z.number(),
  views: z.number(),
  handle: z.string().nullable(),
  platformId: z.string().nullable(),
  publishedAt: z.date().nullable(),
  title: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  mediaType: z.enum(["image", "video", "carousel"]).optional(),
  thumbnailUrls: z.array(z.string()).optional(),
});

export const createBountySubmissionInputSchema = z.object({
  programId: z.string(),
  bountyId: z.string(),
  files: z
    .array(BountySubmissionFileSchema)
    .max(BOUNTY_MAX_SUBMISSION_FILES)
    .default([]),
  urls: z.array(z.httpUrl()).max(BOUNTY_MAX_SUBMISSION_URLS).default([]),
  description: z
    .string()
    .trim()
    .max(BOUNTY_MAX_SUBMISSION_DESCRIPTION_LENGTH)
    .optional(),
  isDraft: z
    .boolean()
    .default(false)
    .describe("Whether to create a draft submission or a final submission."),
  periodNumber: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      "The period number to submit for. Required for multi-submission bounties.",
    ),
});
