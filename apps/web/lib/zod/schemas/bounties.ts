import {
  BountySubmissionRejectionReason,
  BountySubmissionStatus,
  BountyType,
} from "@dub/prisma/client";
import { z } from "zod";
import { CommissionSchema } from "./commissions";
import { GroupSchema } from "./groups";
import { getPaginationQuerySchema } from "./misc";
import { EnrolledPartnerSchema } from "./partners";
import { UserSchema } from "./users";
import { parseDateSchema } from "./utils";
import { workflowConditionSchema } from "./workflows";

export const SUBMISSION_REQUIREMENTS = ["image", "url"] as const;

export const MAX_SUBMISSION_FILES = 4;

export const MAX_SUBMISSION_URLS = 4;

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
    .max(500, "Description must be less than 500 characters")
    .nullish(),
  type: z.nativeEnum(BountyType),
  startsAt: parseDateSchema,
  endsAt: parseDateSchema.nullish(),
  rewardAmount: z.number().min(1, "Reward amount must be greater than 1"),
  submissionRequirements: submissionRequirementsSchema.nullish(),
  groupIds: z.array(z.string()).nullable(),
  performanceCondition: workflowConditionSchema.nullish(),
});

export const updateBountySchema = createBountySchema
  .omit({
    type: true,
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
  rewardAmount: z.number(),
  performanceCondition: workflowConditionSchema.nullable().default(null),
  submissionRequirements: submissionRequirementsSchema.nullable().default(null),
  groups: z.array(GroupSchema.pick({ id: true })),
});

// used in GET /bounties
export const BountyListSchema = BountySchema.extend({
  submissionsCount: z.number().default(0),
});

export const BountySchemaExtended = BountyListSchema.extend({
  partnersCount: z.number().default(0),
});

export const BountySubmissionSchema = z.object({
  id: z.string(),
  description: z.string().nullable(),
  urls: z.array(z.string()).nullable(),
  files: z.array(BountySubmissionFileSchema).nullable(),
  status: z.nativeEnum(BountySubmissionStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
  reviewedAt: z.date().nullable(),
  rejectionReason: z.string().nullable(),
  rejectionNote: z.string().nullable(),
});

export const BountySubmissionExtendedSchema = z.object({
  submission: BountySubmissionSchema.nullable(),
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
    leads: true,
    conversions: true,
    saleAmount: true,
    totalCommissions: true,
  }),
  commission: CommissionSchema.pick({
    id: true,
    amount: true,
    earnings: true,
    status: true,
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

export const REJECT_BOUNTY_SUBMISSION_REASONS = {
  invalidProof: "Invalid proof",
  duplicateSubmission: "Duplicate submission",
  outOfTimeWindow: "Out of time window",
  didNotMeetCriteria: "Did not meet criteria",
  other: "Other",
} as const;

export const getBountySubmissionsQuerySchema = z
  .object({
    sortBy: z
      .enum(["createdAt", "leads", "conversions", "saleAmount", "commissions"])
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    status: z.nativeEnum(BountySubmissionStatus).optional(),
    groupId: z.string().optional(),
  })
  .merge(getPaginationQuerySchema({ pageSize: 100 }));
