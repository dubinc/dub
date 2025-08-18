import { BountySubmissionStatus, BountyType } from "@dub/prisma/client";
import { z } from "zod";
import { CommissionSchema } from "./commissions";
import { booleanQuerySchema, getPaginationQuerySchema } from "./misc";
import { PartnerSchema } from "./partners";
import { UserSchema } from "./users";
import { parseDateSchema } from "./utils";

export const SUBMISSION_REQUIREMENTS = ["image", "url"] as const;

export const createBountySchema = z.object({
  name: z
    .string()
    .trim()
    .max(100, "Name must be less than 100 characters")
    .nullish(),
  description: z
    .string()
    .trim()
    .max(5000, "Description must be less than 5000 characters")
    .nullish(),
  type: z.nativeEnum(BountyType),
  startsAt: parseDateSchema,
  endsAt: parseDateSchema.nullish(),
  rewardAmount: z.number().min(1, "Reward amount must be greater than 1"),
  submissionRequirements: z
    .array(z.enum(SUBMISSION_REQUIREMENTS))
    .min(0)
    .max(2)
    .nullish(),
  groupIds: z.array(z.string()).nullable(),
});

export const BountySchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  description: z.string().nullable(),
  type: z.nativeEnum(BountyType),
  startsAt: z.date(),
  endsAt: z.date().nullable(),
  rewardAmount: z.number(),
});

export const BountySchemaExtended = BountySchema.extend({
  partners: z.number().default(0),
});

export const BountySubmissionSchema = z.object({
  id: z.string(),
  description: z.string().nullable(),
  evidenceUrl: z.string(),
  status: z.nativeEnum(BountySubmissionStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
  reviewedAt: z.date().nullable(),
  rejectionReason: z.string().nullable(),
  rejectionNote: z.string().nullable(),
  partner: PartnerSchema.pick({
    id: true,
    name: true,
    email: true,
    image: true,
    payoutsEnabledAt: true,
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

export const BOUNTIES_MAX_PAGE_SIZE = 100;

export const getBountiesQuerySchema = z
  .object({
    sortBy: z.enum(["createdAt"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
    includeExpandedFields: booleanQuerySchema.optional(),
  })
  .merge(getPaginationQuerySchema({ pageSize: BOUNTIES_MAX_PAGE_SIZE }));
