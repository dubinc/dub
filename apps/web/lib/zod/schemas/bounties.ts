import {
  BOUNTY_DESCRIPTION_MAX_LENGTH,
  BOUNTY_MAX_SUBMISSION_REJECTION_NOTE_LENGTH,
} from "@/lib/constants/bounties";
import {
  BountyPerformanceScope,
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
import { workflowConditionSchema } from "./workflows";

// Object format with image and url keys
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
});

// Type exports for TypeScript
export type SubmissionRequirements = z.infer<
  typeof submissionRequirementsSchema
>;

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
  performanceCondition: workflowConditionSchema.nullish(),
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
  url: z.string(),
  fileName: z.string(),
  size: z.number(),
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
  rewardAmount: z.number().nullable(),
  rewardDescription: z.string().nullable(),
  performanceCondition: workflowConditionSchema.nullable().default(null),
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

export const BountySubmissionSchema = z.object({
  id: z.string(),
  description: z.string().nullable(),
  urls: z.array(z.string()).nullable(),
  files: z.array(BountySubmissionFileSchema).nullable(),
  status: z.enum(BountySubmissionStatus),
  performanceCount: z.number().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().nullable(),
  reviewedAt: z.date().nullable(),
  rejectionReason: z.string().nullable(),
  rejectionNote: z.string().nullable(),
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

export const rejectBountySubmissionSchema = z.object({
  workspaceId: z.string(),
  submissionId: z.string(),
  rejectionReason: z.enum(BountySubmissionRejectionReason),
  rejectionNote: z
    .string()
    .trim()
    .max(BOUNTY_MAX_SUBMISSION_REJECTION_NOTE_LENGTH)
    .optional(),
});

export const getBountySubmissionsQuerySchema = z
  .object({
    status: z.enum(BountySubmissionStatus).optional(),
    groupId: z.string().optional(),
    partnerId: z.string().optional(),
    sortBy: z.enum(["completedAt", "performanceCount"]).default("completedAt"),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
  })
  .extend(getPaginationQuerySchema({ pageSize: 100 }));
