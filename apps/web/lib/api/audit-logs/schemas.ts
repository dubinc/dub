import {
  BountySchema,
  BountySubmissionSchema,
} from "@/lib/zod/schemas/bounties";
import { CommissionSchema } from "@/lib/zod/schemas/commissions";
import { DiscountSchema } from "@/lib/zod/schemas/discount";
import { GroupSchema } from "@/lib/zod/schemas/groups";
import { PartnerSchema } from "@/lib/zod/schemas/partners";
import { PayoutSchema } from "@/lib/zod/schemas/payouts";
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
  ip_address: z.string().nullable(),
  user_agent: z.string().nullable(),
  metadata: z.string().nullable(),
});

const actionSchema = z.enum([
  // Program
  "program.created",
  "program.updated",

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
  "partner.created",
  "partner.archived",
  "partner.invited",
  "partner.approved",
  "partner.invite_deleted",
  "partner.invite_resent",
  "partner.enrollment_updated",
  "partner.deactivated",
  "partner.reactivated",
  "partner.banned",
  "partner.unbanned",

  // Auto approve partners
  "auto_approve_partner.enabled",
  "auto_approve_partner.disabled",

  // Commissions & clawbacks
  "commission.created",
  "commission.updated",
  "clawback.created",
  "commission.canceled",
  "commission.marked_fraud",
  "commission.marked_duplicate",

  // Payouts
  "payout.confirmed",
  "payout.marked_paid",

  // Groups
  "group.created",
  "group.updated",
  "group.deleted",

  // Bounties
  "bounty.created",
  "bounty.updated",
  "bounty.deleted",
  "bounty_submission.approved",
  "bounty_submission.rejected",
  "bounty_submission.reopened",
]);

export const auditLogTarget = z.union([
  z.object({
    type: z.literal("program"),
    id: z.string(),
    metadata: ProgramSchema.pick({
      domain: true,
      url: true,
      linkStructure: true,
      supportEmail: true,
      helpUrl: true,
      termsUrl: true,
      holdingPeriodDays: true,
      minPayoutAmount: true,
      autoApprovePartnersEnabledAt: true,
      messagingEnabledAt: true,
    }).optional(),
  }),

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
    type: z.union([z.literal("commission"), z.literal("clawback")]),
    id: z.string(),
    metadata: CommissionSchema.pick({
      type: true,
      amount: true,
      earnings: true,
      currency: true,
    }),
  }),

  z.object({
    type: z.literal("payout"),
    id: z.string(),
    metadata: PayoutSchema.pick({
      status: true,
    }),
  }),

  z.object({
    type: z.literal("group"),
    id: z.string(),
    metadata: GroupSchema.pick({
      name: true,
      slug: true,
      color: true,
    }).extend({
      clickRewardId: z.string().nullish(),
      leadRewardId: z.string().nullish(),
      saleRewardId: z.string().nullish(),
      discountId: z.string().nullish(),
    }),
  }),

  z.object({
    type: z.literal("bounty"),
    id: z.string(),
    metadata: BountySchema,
  }),

  z.object({
    type: z.literal("bounty_submission"),
    id: z.string(),
    metadata: BountySubmissionSchema,
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
  ipAddress: z.string().nullish(),
  userAgent: z.string().nullish(),
  targets: z.array(auditLogTarget).nullish(),
  metadata: z.record(z.string(), z.any()).nullish(),
  req: z.instanceof(Request).nullish(),
});
