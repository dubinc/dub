import { parseDateSchema } from "@/lib/zod/schemas/utils";
import { DUB_FOUNDING_DATE, formatDate } from "@dub/utils";
import { z } from "zod";

export enum EventType {
  PROGRAM_CREATE = "program.create",
  PROGRAM_UPDATE = "program.update",
  PARTNER_ENROLL = "partner.enroll",
  PARTNER_INVITE = "partner.invite",
  PARTNER_APPROVE = "partner.approve",
  PARTNER_REJECT = "partner.reject",
  PARTNER_LINK_CREATE = "partner_link.create",
  PARTNER_LINK_UPDATE = "partner_link.update",
  PARTNER_LINK_DELETE = "partner_link.delete",
  PAYOUT_CONFIRM = "payout.confirm",
  PAYOUT_CREATE_MANUAL = "payout.create_manual",
  DISCOUNT_CREATE = "discount.create",
  DISCOUNT_UPDATE = "discount.update",
  DISCOUNT_DELETE = "discount.delete",
  REWARD_CREATE = "reward.create",
  REWARD_UPDATE = "reward.update",
  REWARD_DELETE = "reward.delete",
  COMMISSION_UPDATE = "commission.update",
}

const actorTypes = z.enum(["user", "system"]);

export const auditLogSchema = z.object({
  id: z.string(),
  workspace_id: z.string(),
  program_id: z.string(),
  action: z.nativeEnum(EventType),
  actor_type: actorTypes,
  actor_id: z.string(),
  actor_name: z.string(),
  description: z.string(),
  ip: z.string(),
  user_agent: z.string(),
  timestamp: z.string(),
});

export const auditLogExportQuerySchema = z.object({
  start: parseDateSchema.refine((value: Date) => value >= DUB_FOUNDING_DATE, {
    message: `The start date cannot be earlier than ${formatDate(
      DUB_FOUNDING_DATE,
    )}.`,
  }),
  end: parseDateSchema,
});

const ProgramCreateOrUpdateEvent = z.object({
  type: z.enum([EventType.PROGRAM_CREATE, EventType.PROGRAM_UPDATE]),
  metadata: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    domain: z.string(),
    url: z.string(),
  }),
});

const PartnerActionEvent = z.object({
  type: z.enum([
    EventType.PARTNER_ENROLL,
    EventType.PARTNER_INVITE,
    EventType.PARTNER_APPROVE,
    EventType.PARTNER_REJECT,
  ]),
  metadata: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
});

const PartnerLinkEvent = z.object({
  type: z.enum([
    EventType.PARTNER_LINK_CREATE,
    EventType.PARTNER_LINK_UPDATE,
    EventType.PARTNER_LINK_DELETE,
  ]),
  metadata: z.object({
    id: z.string(),
    key: z.string(),
    domain: z.string(),
    url: z.string(),
  }),
});

const PayoutCreateEvent = z.object({
  type: z.literal(EventType.PAYOUT_CREATE_MANUAL),
  metadata: z.object({
    id: z.string(),
    amount: z.number(),
    status: z.string(),
  }),
});

const PayoutConfirmEvent = z.object({
  type: z.literal(EventType.PAYOUT_CONFIRM),
  metadata: z.object({
    id: z.string(),
    amount: z.number(),
    status: z.string(),
  }),
});

const CommissionUpdateEvent = z.object({
  type: z.literal(EventType.COMMISSION_UPDATE),
  metadata: z.object({
    id: z.string(),
    amount: z.number(),
  }),
});

const DiscountEvent = z.object({
  type: z.literal(EventType.DISCOUNT_CREATE),
  metadata: z.object({
    id: z.string(),
  }),
});

const RewardEvent = z.object({
  type: z.literal(EventType.REWARD_CREATE),
  metadata: z.object({
    id: z.string(),
  }),
});

const AuditLogEvent = z.union([
  ProgramCreateOrUpdateEvent,
  PartnerActionEvent,
  PartnerLinkEvent,
  PayoutCreateEvent,
  PayoutConfirmEvent,
  CommissionUpdateEvent,
  DiscountEvent,
  RewardEvent,
]);

export const createAuditLogSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  event: AuditLogEvent,
  actorType: actorTypes.optional(),
  actorId: z.string(),
  actorName: z.string(),
  description: z.string().optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
});
