import { parseDateSchema } from "@/lib/zod/schemas/utils";
import { DUB_FOUNDING_DATE, formatDate, nanoid } from "@dub/utils";
import { z } from "zod";

const actions = z.enum([
  "program.create",
  "program.update",
  "partner.enroll",
  "partner.invite",
  "partner.approve",
  "partner.reject",
  "partner_link.create",
  "partner_link.update",
  "partner_link.delete",
  "payout.confirm",
  "payout.create_manual",
  "discount.create",
  "discount.update",
  "discount.delete",
  "reward.create",
  "reward.update",
  "reward.delete",
  "commission.update",
]);

const targetTypes = z.enum([
  "program",
  "partner",
  "partner_invite",
  "invoice",
  "discount",
  "reward",
  "payout",
  "commission",
]);

const actorTypes = z.enum(["user", "system"]);

const target = z.object({
  id: z.string(),
  type: targetTypes,
});

export const AuditLogSchema = z.object({
  id: z.string(),
  workspace_id: z.string(),
  program_id: z.string(),
  action: actions,
  actor_type: actorTypes,
  actor_id: z.string(),
  actor_name: z.string(),
  targets: z.array(target),
  description: z.string(),
  ip: z.string(),
  user_agent: z.string(),
  timestamp: z.string(),
});


export const createAuditLogSchema = z.object({
  id: z.string().optional().default(nanoid(16)),
  workspace_id: z.string(),
  program_id: z.string(),
  action: actions,
  actor_type: actorTypes.optional().default("user"),
  actor_id: z.string(),
  actor_name: z.string(),
  targets: z
    .array(target)
    .optional()
    .transform((val) => (val ? JSON.stringify(val) : "[]")),
  description: z.string().optional().default(""),
  ip: z.string().optional().default(""),
  user_agent: z.string().optional().default(""),
  timestamp: z.string().optional().default(new Date().toISOString()),
});

export const auditLogExportQuerySchema = z.object({
  start: parseDateSchema.refine((value: Date) => value >= DUB_FOUNDING_DATE, {
    message: `The start date cannot be earlier than ${formatDate(
      DUB_FOUNDING_DATE,
    )}.`,
  }),
  end: parseDateSchema,
});

