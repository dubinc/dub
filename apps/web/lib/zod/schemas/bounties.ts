import {
  BOUNTY_DESCRIPTION_MAX_LENGTH,
  BOUNTY_MAX_SUBMISSION_DESCRIPTION_LENGTH,
  BOUNTY_MAX_SUBMISSION_FILES,
  BOUNTY_MAX_SUBMISSION_REJECTION_NOTE_LENGTH,
  BOUNTY_MAX_SUBMISSION_URLS,
  BOUNTY_SOCIAL_PLATFORM_METRICS,
  BOUNTY_SOCIAL_PLATFORM_VALUES,
} from "@/lib/bounty/constants";
import {
  BountyPerformanceScope,
  BountySubmissionFrequency,
  BountySubmissionRejectionReason,
  BountySubmissionStatus,
  BountyType,
} from "@dub/prisma/client";
import * as z from "zod/v4";
import { CommissionSchema } from "./commissions";
import { GroupSchema } from "./groups";
import { booleanQuerySchema, getPaginationQuerySchema } from "./misc";
import { EnrolledPartnerSchema } from "./partners";
import { UserSchema } from "./users";
import { parseDateSchema } from "./utils";
import { WORKFLOW_ATTRIBUTES } from "./workflows";

export const bountyPerformanceConditionSchema = z.object({
  attribute: z.enum(WORKFLOW_ATTRIBUTES),
  operator: z.literal("gte").default("gte"),
  value: z.number(),
});

// Eg: for each additional 1000 views, earn $1, up to $100
export const bountySocialContentIncrementalBonusSchema = z
  .object({
    incrementalAmount: z.number().int().positive().optional(),
    bonusAmount: z.number().min(0).optional(),
    capAmount: z.number().int().positive().optional(),
  })
  .refine(
    ({ incrementalAmount, capAmount }) => {
      if (
        incrementalAmount != null &&
        capAmount != null &&
        !Number.isNaN(incrementalAmount) &&
        !Number.isNaN(capAmount)
      ) {
        return capAmount >= incrementalAmount;
      }

      return true;
    },
    {
      message: "Cap must be at least the incremental amount",
      path: ["capAmount"],
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
    .nullish(),
  description: z
    .string()
    .trim()
    .max(
      BOUNTY_DESCRIPTION_MAX_LENGTH,
      `Description must be less than ${BOUNTY_DESCRIPTION_MAX_LENGTH} characters`,
    )
    .nullish(),
  type: z.enum(BountyType),
  startsAt: parseDateSchema.nullish(),
  endsAt: parseDateSchema.nullish(),
  submissionsOpenAt: parseDateSchema.nullish(),
  submissionFrequency: z.enum(BountySubmissionFrequency).nullish(),
  totalSubmissionsAllowed: z.number().int().positive().nullish(),
  rewardAmount: z
    .number()
    .min(1, "Reward amount must be greater than 1")
    .nullable(),
  rewardDescription: z
    .string()
    .trim()
    .max(100, "Reward description must be less than 100 characters")
    .transform((v) => (v === "" ? null : v))
    .nullish(),
  submissionRequirements: submissionRequirementsSchema.nullish(),
  groupIds: z.array(z.string()).nullable(),
  performanceCondition: bountyPerformanceConditionSchema.nullish(),
  performanceScope: z.enum(BountyPerformanceScope).nullish(),
  sendNotificationEmails: z.boolean().optional(),
});

export const updateBountySchema = createBountySchema
  .omit({
    // omit fields that cannot be updated after creation
    type: true,
    performanceScope: true,
  })
  .partial();

export const BountySubmissionFileSchema = z.object({
  url: z.string().describe("The URL of the uploaded file."),
  fileName: z.string().describe("The original file name."),
  size: z.number().describe("The file size in bytes."),
});

// used in POST, PATCH, DELETE /bounties + bounty.created, bounty.updated webhooks
export const BountySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  type: z.enum(BountyType),
  startsAt: z.date(),
  endsAt: z.date().nullable(),
  submissionsOpenAt: z.date().nullable(),
  submissionFrequency: z.enum(BountySubmissionFrequency).nullable(),
  totalSubmissionsAllowed: z.number().nullable(),
  rewardAmount: z.number().nullable(),
  rewardDescription: z.string().nullable(),
  performanceCondition: bountyPerformanceConditionSchema
    .nullable()
    .default(null),
  performanceScope: z.enum(BountyPerformanceScope).nullable(),
  submissionRequirements: submissionRequirementsSchema.nullable().default(null),
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
  performanceCount: z
    .number()
    .nullable()
    .meta({ description: "The performance count of the submission" }),
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
      .enum(["completedAt", "performanceCount"])
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
  urls: z.array(z.url()).max(BOUNTY_MAX_SUBMISSION_URLS).default([]),
  description: z
    .string()
    .trim()
    .max(BOUNTY_MAX_SUBMISSION_DESCRIPTION_LENGTH)
    .optional(),
  isDraft: z
    .boolean()
    .default(false)
    .describe("Whether to create a draft submission or a final submission."),
});
