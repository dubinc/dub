import { DiscountSchema } from "@/lib/zod/schemas/discount";
import { PartnerSchema } from "@/lib/zod/schemas/partners";
import { PayoutSchema } from "@/lib/zod/schemas/payouts";
import { ProgramSaleSchema } from "@/lib/zod/schemas/program-sales";
import { ProgramSchema } from "@/lib/zod/schemas/programs";
import { RewardSchema } from "@/lib/zod/schemas/rewards";
import { z } from "zod";

// TODO:
// Rename sale -> commission

const EVENT_TYPES = [
  "program.create",
  "program.update",
  "partner.enroll",
  "partner.approve",
  "partner.reject",
  "sale.update",
  "sale.mark_duplicate",
  "sale.mark_fraud",
  "sale.mark_pending",
  "payout.create",
  "payout.update",
  "payout.confirm",
  "reward.create",
  "reward.update",
  "reward.delete",
  "discount.create",
  "discount.update",
  "discount.delete",
] as const;

const ACTOR_TYPES = ["user", "system"] as const;

const ProgramCreateEvent = z.object({
  type: z.literal("program"),
  id: z.string(),
  metadata: ProgramSchema.pick({
    name: true,
    defaultDiscountId: true,
    defaultRewardId: true,
    holdingPeriodDays: true,
    minPayoutAmount: true,
  }),
});

const ProgramUpdateEvent = z.object({
  type: z.literal("program"),
  id: z.string(),
  metadata: ProgramSchema.pick({
    name: true,
    defaultDiscountId: true,
    defaultRewardId: true,
    holdingPeriodDays: true,
    minPayoutAmount: true,
  }),
});

const PartnerEvent = z.object({
  type: z.literal("partner"),
  id: z.string(),
  metadata: PartnerSchema.pick({
    name: true,
  }),
});

const SaleUpdateEvent = z.object({
  type: z.literal("sale"),
  id: z.string(),
  metadata: ProgramSaleSchema.pick({
    amount: true,
    earnings: true,
    status: true,
  }),
});

const PayoutEvent = z.object({
  type: z.literal("payout"),
  id: z.string(),
  metadata: PayoutSchema.pick({
    amount: true,
    status: true,
    quantity: true,
  }),
});

const PayoutConfirmEvent = z.object({
  type: z.literal("payout"),
  id: z.string(),
  metadata: PayoutSchema.pick({
    amount: true,
  }),
});

const RewardEvent = z.object({
  type: z.literal("reward"),
  id: z.string(),
  metadata: RewardSchema.pick({
    event: true,
    type: true,
    amount: true,
    maxDuration: true,
  }),
});

const DiscountEvent = z.object({
  type: z.literal("discount"),
  id: z.string(),
  metadata: DiscountSchema.pick({
    type: true,
    amount: true,
    maxDuration: true,
  }),
});

export const AuditLogEvent = z.union([
  ProgramCreateEvent,
  ProgramUpdateEvent,
  PartnerEvent,
  SaleUpdateEvent,
  PayoutEvent,
  PayoutConfirmEvent,
  RewardEvent,
  DiscountEvent,
]);

export const recordAuditLogSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  event: z.enum(EVENT_TYPES),
  actor: z.object({
    type: z.enum(ACTOR_TYPES).optional(),
    id: z.string(),
    name: z.string().nullable(),
  }),
  targets: z.array(AuditLogEvent),
  description: z.string().optional(),
  location: z.string().optional(),
  userAgent: z.string().optional(),
  timestamp: z.string().optional(),
  req: z.instanceof(Request).optional(),
});

export const auditLogSchema = z.object({
  id: z.string(),
  workspace_id: z.string(),
  program_id: z.string(),
  event: z.enum(EVENT_TYPES),
  actor_type: z.enum(ACTOR_TYPES),
  actor_id: z.string(),
  actor_name: z.string(),
  description: z.string(),
  location: z.string(),
  user_agent: z.string(),
  timestamp: z.string(),
  targets: z.string(),
});

export type RecordAuditLog = z.input<typeof recordAuditLogSchema>;
