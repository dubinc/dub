import { DiscountProps } from "@/lib/types";
import { z } from "zod";

export enum EventType {
  PROGRAM_CREATE = "program.create",
  PROGRAM_UPDATE = "program.update",

  PARTNER_INVITE = "partner.invite",
  PARTNER_APPROVE = "partner.approve",
  PARTNER_REJECT = "partner.reject",

  PARTNER_LINK_CREATE = "partner_link.create",
  PARTNER_LINK_UPDATE = "partner_link.update",
  PARTNER_LINK_DELETE = "partner_link.delete",

  SALE_UPDATE = "sale.update",
  PAYOUT_CONFIRM = "payout.confirm",
  PAYOUT_CREATE = "payout.create",
  COMMISSION_UPDATE = "commission.update",

  DISCOUNT_CREATE = "discount.create",
  DISCOUNT_UPDATE = "discount.update",
  DISCOUNT_DELETE = "discount.delete",

  REWARD_CREATE = "reward.create",
  REWARD_UPDATE = "reward.update",
  REWARD_DELETE = "reward.delete",
}

interface CreateProgramEvent {
  type: EventType.PROGRAM_CREATE;
  metadata: {
    id: string;
    domain: string;
    url: string;
    holdingPeriodDays: number;
    minPayoutAmount: number;
  };
}

interface UpdateProgramEvent {
  type: EventType.PROGRAM_UPDATE;
  metadata: {
    id: string;
    domain: string;
    url: string;
    holdingPeriodDays: number;
    minPayoutAmount: number;
  };
}

interface DiscountCreateEvent {
  type: EventType.DISCOUNT_CREATE;
  metadata: Pick<DiscountProps, "id" | "amount" | "type" | "maxDuration">;
}

interface DiscountUpdateEvent {
  type: EventType.DISCOUNT_UPDATE;
  metadata: Pick<DiscountProps, "id" | "amount" | "type" | "maxDuration">;
}

interface DiscountDeleteEvent {
  type: EventType.DISCOUNT_DELETE;
  metadata: Pick<DiscountProps, "id" | "amount" | "type" | "maxDuration">;
}

export type AuditLogEvent =
  | CreateProgramEvent
  | UpdateProgramEvent
  | DiscountCreateEvent
  | DiscountUpdateEvent
  | DiscountDeleteEvent;

interface Actor {
  type: "user" | "system";
  id: string;
  name: string;
}

export interface CreateAuditLogEvent {
  workspaceId: string;
  programId: string;
  actor: Actor;
  event: AuditLogEvent;
  description?: string;
  ip?: string;
  userAgent?: string;
  req?: Request;
}

export const auditLogSchema = z.object({
  id: z.string(),
  workspace_id: z.string(),
  program_id: z.string(),
  action: z.nativeEnum(EventType),
  actor_type: z.enum(["user", "system"]),
  actor_id: z.string(),
  actor_name: z.string(),
  description: z.string(),
  ip: z.string(),
  user_agent: z.string(),
  timestamp: z.string(),
  metadata: z.record(z.string(), z.any()),
});
