import { DiscountSchema } from "@/lib/zod/schemas/discount";
import { RewardSchema } from "@/lib/zod/schemas/rewards";
import { z } from "zod";

// Schema that represents the audit log schema in Tinybird
export const auditLogSchemaTB = z.object({
  id: z.string(),
  timestamp: z.string(),
  workspace_id: z.string(),
  program_id: z.string(),
  action: z.string(),
  actor_id: z.string(),
  actor_type: z.string(),
  actor_name: z.string(),
  description: z.string(),
  targets: z.string().nullable(),
  location: z.string().nullable(),
  user_agent: z.string().nullable(),
  metadata: z.string().nullable(),
});

// Schema that represents the audit log in the CSV file
export const auditLogSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  workspaceId: z.string(),
  programId: z.string(),
  action: z.string(),
  actorId: z.string(),
  actorType: z.string(),
  actorName: z.string(),
  description: z.string(),
  targets: z.array(z.record(z.string(), z.any())).nullable(),
  location: z.string().nullable(),
  userAgent: z.string().nullable(),
  metadata: z.record(z.string(), z.any()).nullable(),
});

const actionSchema = z.enum([
  // Rewards
  "reward.created",
  "reward.updated",
  "reward.deleted",

  // Discounts
  "discount.created",
  "discount.updated",
  "discount.deleted",
]);

const rewardEvent = z.object({
  type: z.literal("reward"),
  id: z.string(),
  metadata: RewardSchema.pick({
    event: true,
    type: true,
    amount: true,
    maxDuration: true,
  }),
});

const discountEvent = z.object({
  type: z.literal("discount"),
  id: z.string(),
  metadata: DiscountSchema.pick({
    type: true,
    amount: true,
    maxDuration: true,
    couponId: true,
  }),
});

export const auditLogEvent = z.union([rewardEvent, discountEvent]);

export const recordAuditLogInputSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  action: actionSchema,
  actor: z.object({
    id: z.string(),
    name: z.string().nullish(),
    type: z.string().nullish(),
  }),
  description: z.string().nullish(),
  location: z.string().nullish(),
  userAgent: z.string().nullish(),
  targets: z.array(auditLogEvent).nullish(),
  metadata: z.record(z.string(), z.any()).nullish(),
  req: z.instanceof(Request).nullish(),
});
