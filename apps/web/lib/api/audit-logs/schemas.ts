import { nanoid } from "@dub/utils";
import { z } from "zod";

const actions = z.enum([
  "program.create",
  "program.update",
  "partner.enroll",
  "partner_link.create",
  "partner_link.update",
  "partner_link.delete",
]);

const actorTypes = z.enum(["user", "system"]);

const targetTypes = z.enum(["program", "partner"]);

const target = z.object({
  id: z.string(),
  type: targetTypes,
});

export const AuditLog = z.object({
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

export const auditLogSchemaTB = z.object({
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
