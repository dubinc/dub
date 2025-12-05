import { formatUTCDateTimeClickhouse } from "@/lib/analytics/utils/format-utc-datetime-clickhouse";
import { tb } from "@/lib/tinybird";
import { z } from "zod";
import { prefixWorkspaceId } from "../workspaces/workspace-id";

export const auditLogFilterSchemaTB = z.object({
  workspaceId: z.string().transform(prefixWorkspaceId),
  programId: z.string(),
  start: z.string(),
  end: z.string(),
});

export const auditLogResponseSchemaTB = z.object({
  id: z.string(),
  timestamp: z.string(),
  action: z.string(),
  actor_id: z.string(),
  actor_type: z.string(),
  actor_name: z.string(),
  description: z.string(),
  ip_address: z.string(),
  user_agent: z.string(),
  targets: z.string(),
  metadata: z.string(),
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
  programId: string;
}) => {
  const pipe = tb.buildPipe({
    pipe: "get_audit_logs",
    parameters: auditLogFilterSchemaTB,
    data: auditLogResponseSchemaTB,
  });

  const events = await pipe({
    workspaceId,
    programId,
    start: formatUTCDateTimeClickhouse(start),
    end: formatUTCDateTimeClickhouse(end),
  });

  return events.data;
};
