import { CommissionSchema } from "@/lib/zod/schemas/commissions";
import { DiscountSchema } from "@/lib/zod/schemas/discount";
import { PartnerSchema } from "@/lib/zod/schemas/partners";
import { ProgramSchema } from "@/lib/zod/schemas/programs";
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

  // Partner applications
  "partner_application.approved",
  "partner_application.rejected",

  // Partner enrollments
  "partner.archived",
  "partner.banned",
  "partner.unbanned",
  "partner.invited",
  "partner.approved",
  "partner.invited",
  "partner.invite_deleted",
  "partner.invite_resent",

  // Auto approve partners
  "auto_approve_partner.enabled",
  "auto_approve_partner.disabled",

  // Commissions & clawbacks
  "commission.created",
  "clawback.created",
]);

export const auditLogTarget = z.union([
  z.object({
    type: z.literal("reward"),
    id: z.string(),
    metadata: RewardSchema.pick({
      event: true,
      type: true,
      amount: true,
      maxDuration: true,
    }),
  }),

  z.object({
    type: z.literal("discount"),
    id: z.string(),
    metadata: DiscountSchema.pick({
      type: true,
      amount: true,
      maxDuration: true,
      couponId: true,
    }),
  }),

  z.object({
    type: z.literal("partner"),
    id: z.string(),
    metadata: PartnerSchema.pick({
      name: true,
      email: true,
    }),
  }),

  z.object({
    type: z.literal("program"),
    id: z.string(),
    metadata: ProgramSchema.pick({
      name: true,
      supportEmail: true,
      autoApprovePartnersEnabledAt: true,
    }).optional(),
  }),

  z.object({
    type: z.union([z.literal("commission"), z.literal("clawback")]),
    id: z.string(),
    metadata: CommissionSchema.pick({
      type: true,
      amount: true,
      earnings: true,
      currency: true,
    }),
  }),
]);

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
  targets: z.array(auditLogTarget).nullish(),
  metadata: z.record(z.string(), z.any()).nullish(),
  req: z.instanceof(Request).nullish(),
});
