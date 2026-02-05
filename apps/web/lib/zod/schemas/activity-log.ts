import * as z from "zod/v4";
import { UserSchema } from "./users";

const activityLogResourceTypeSchema = z.enum([
  "referral",
  "programEnrollment",
  "reward",
]);

const activityLogActionSchema = z.enum([
  "referral.created",
  "referral.updated",
  "referral.qualified",
  "referral.meeting",
  "referral.negotiation",
  "referral.unqualified",
  "referral.closedWon",
  "referral.closedLost",
  "programEnrollment.groupChanged",
  "reward.created",
  "reward.updated",
  "reward.deleted",
]);

export type ActivityLogResourceType = z.infer<
  typeof activityLogResourceTypeSchema
>;

export type ActivityLogAction = z.infer<typeof activityLogActionSchema>;

export const getActivityLogsQuerySchema = z.object({
  resourceType: activityLogResourceTypeSchema,
  resourceId: z.string(),
});

const fieldDiffSchema = z.object({
  old: z.unknown().nullable(),
  new: z.unknown().nullable(),
});

export const activityLogSchema = z.object({
  id: z.string(),
  action: activityLogActionSchema,
  description: z.string().nullable(),
  changeSet: z.record(z.string(), fieldDiffSchema),
  createdAt: z.date(),
  user: UserSchema,
});
