import { BountyType } from "@dub/prisma/client";
import { z } from "zod";
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
