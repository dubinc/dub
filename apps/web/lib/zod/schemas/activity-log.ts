import * as z from "zod/v4";
import { UserSchema } from "./users";

export const activityLogResourceTypeSchema = z.enum([
  "referral",
  "partner",
  "reward",
]);

export const activityLogActionSchema = z.enum([
  "referral.created",
  "referral.updated",
  "referral.qualified",
  "referral.meeting",
  "referral.negotiation",
  "referral.unqualified",
  "referral.closedWon",
  "referral.closedLost",
  "partner.groupChanged",
  "reward.created",
  "reward.updated",
  "reward.deleted",
]);

export const getActivityLogsQuerySchema = z.object({
  resourceType: activityLogResourceTypeSchema,
  resourceId: z.string(),
  action: activityLogActionSchema.optional(),
});

export const fieldDiffSchema = z.object({
  old: z.unknown().nullable(),
  new: z.unknown().nullable(),
});

export const activityLogSchema = z.object({
  id: z.string(),
  action: activityLogActionSchema,
  description: z.string().nullable(),
  changeSet: z.record(z.string(), fieldDiffSchema).nullable(),
  createdAt: z.date(),
  user: UserSchema.nullable().default(null),
});
