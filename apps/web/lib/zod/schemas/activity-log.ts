import * as z from "zod/v4";
import { UserSchema } from "./users";

export const activityLogResourceTypeSchema = z.enum([
  "partner",
  "commission",
  "clickReward",
  "saleReward",
  "leadReward",
  "submittedLead",
]);

export const activityLogActionSchema = z.enum([
  "partner_application.approved", // TODO: change to partnerApplication.approved
  "partner_application.rejected", // TODO: change to partnerApplication.rejected
  "partner.groupChanged",
  "partner.banned",
  "partner.unbanned",
  "partner.deactivated",
  "partner.reactivated",
  "partner.archived",
  "partner.unarchived",

  "commission.updated",

  "reward.created",
  "reward.updated",
  "reward.deleted",
  "reward.conditionAdded",
  "reward.conditionRemoved",
  "reward.conditionUpdated",

  "submittedLead.created",
  "submittedLead.updated",
  "submittedLead.qualified",
  "submittedLead.meeting",
  "submittedLead.negotiation",
  "submittedLead.unqualified",
  "submittedLead.closedWon",
  "submittedLead.closedLost",
]);

export const getActivityLogsQuerySchema = z.object({
  resourceType: activityLogResourceTypeSchema,
  resourceId: z.string().optional(),
  parentResourceId: z.string().optional(),
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

export const REWARD_EVENT_TO_RESOURCE_TYPE = {
  click: "clickReward",
  sale: "saleReward",
  lead: "leadReward",
} as const;
