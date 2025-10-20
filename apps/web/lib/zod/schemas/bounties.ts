import { BOUNTY_DESCRIPTION_MAX_LENGTH } from "@/lib/partners/constants";
import {
  BountyPerformanceScope,
  BountySubmissionRejectionReason,
  BountySubmissionStatus,
  BountyType,
} from "@dub/prisma/client";
import { z } from "zod";
import { CommissionSchema } from "./commissions";
import { GroupSchema } from "./groups";
import { booleanQuerySchema, getPaginationQuerySchema } from "./misc";
import { EnrolledPartnerSchema } from "./partners";
import { UserSchema } from "./users";
import { parseDateSchema } from "./utils";
import { workflowConditionSchema } from "./workflows";

export const SUBMISSION_REQUIREMENTS = ["image", "url"] as const;

export const MAX_SUBMISSION_FILES = 4;

export const MAX_SUBMISSION_URLS = 20;

export const REJECT_BOUNTY_SUBMISSION_REASONS = {
  invalidProof: "Invalid proof",
  duplicateSubmission: "Duplicate submission",
  outOfTimeWindow: "Out of time window",
  didNotMeetCriteria: "Did not meet criteria",
  other: "Other",
} as const;

export const BOUNTY_SUBMISSIONS_SORT_BY_COLUMNS = [
  "completedAt",
  "leads",
  "conversions",
  "saleAmount",
  "commissions",
] as const;

export const submissionRequirementsSchema = z
  .array(z.enum(SUBMISSION_REQUIREMENTS))
  .min(0)
  .max(2);

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
  type: z.nativeEnum(BountyType),
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
  performanceScope: z.nativeEnum(BountyPerformanceScope).nullish(),
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
  type: z.nativeEnum(BountyType),
  startsAt: z.date(),
  endsAt: z.date().nullable(),
  submissionsOpenAt: z.date().nullable(),
  rewardAmount: z.number().nullable(),
  rewardDescription: z.string().nullable(),
  performanceCondition: workflowConditionSchema.nullable().default(null),
  performanceScope: z.nativeEnum(BountyPerformanceScope).nullable(),
  submissionRequirements: submissionRequirementsSchema.nullable().default(null),
  groups: z.array(GroupSchema.pick({ id: true })),
});

export const getBountiesQuerySchema = z.object({
  partnerId: z.string().optional(),
  includeSubmissionsCount: booleanQuerySchema.optional().default("false"),
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

export const BountySchemaExtended = BountySchema.extend({
  partnersCount: z.number().default(0),
});

export const BountySubmissionSchema = z.object({
  id: z.string(),
  description: z.string().nullable(),
  urls: z.array(z.string()).nullable(),
  files: z.array(BountySubmissionFileSchema).nullable(),
  status: z.nativeEnum(BountySubmissionStatus),
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
  rejectionReason: z.nativeEnum(BountySubmissionRejectionReason),
  rejectionNote: z.string().trim().max(500).optional(),
});

export const getBountySubmissionsQuerySchema = z
  .object({
    sortBy: z.enum(BOUNTY_SUBMISSIONS_SORT_BY_COLUMNS).default("completedAt"),
    sortOrder: z.enum(["asc", "desc"]).default("asc"),
    status: z.nativeEnum(BountySubmissionStatus).optional(),
    groupId: z.string().optional(),
  })
  .merge(getPaginationQuerySchema({ pageSize: 100 }));
