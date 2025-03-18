import { tb } from "@/lib/tinybird";
import { z } from "zod";
import { auditLogSchema } from "./schemas";

export const auditLogFilterSchemaTB = z.object({
  workspaceId: z.string(),
  programId: z.string().optional(),
  start: z.string(),
  end: z.string(),
});

export const auditLogResponseSchemaTB = auditLogSchema.pick({
  id: true,
  action: true,
  actor_type: true,
  actor_id: true,
  actor_name: true,
  description: true,
  ip: true,
  user_agent: true,
  timestamp: true,
});

export const getAuditLogs = async ({
  workspaceId,
  programId,
  start,
  end,
}: {
  start: Date;
  end: Date;
  workspaceId: string;
  programId?: string;
}) => {
  const pipe = tb.buildPipe({
    pipe: "audit_logs",
    parameters: auditLogFilterSchemaTB,
    data: auditLogResponseSchemaTB,
  });

  const events = await pipe({
    workspaceId,
    programId,
    start: start.toISOString().replace("T", " ").replace("Z", ""),
    end: end.toISOString().replace("T", " ").replace("Z", ""),
  });

  return events.data;
};
