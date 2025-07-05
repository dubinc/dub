import { tb } from "@/lib/tinybird";
import { log } from "@dub/utils";
import { ipAddress as getIPAddress } from "@vercel/functions";
import { headers } from "next/headers";
import { z } from "zod";
import { createId } from "../create-id";
import { getIP } from "../utils";
import { prefixWorkspaceId } from "../workspace-id";
import { auditLogSchemaTB, recordAuditLogInputSchema } from "./schemas";

type AuditLogInput = z.infer<typeof recordAuditLogInputSchema>;

const transformAuditLogTB = (data: AuditLogInput) => {
  const headersList = headers();
  const ipAddress = data.req ? getIPAddress(data.req) : getIP();
  const userAgent = headersList.get("user-agent");

  const auditLogInput = recordAuditLogInputSchema.parse({
    ...data,
    ipAddress,
    userAgent,
  });

  return {
    id: createId({ prefix: "audit_" }),
    timestamp: new Date().toISOString(),
    workspace_id: prefixWorkspaceId(auditLogInput.workspaceId),
    program_id: auditLogInput.programId,
    action: auditLogInput.action,
    actor_id: auditLogInput.actor.id,
    actor_type: auditLogInput.actor.type ?? "user",
    actor_name: auditLogInput.actor.name ?? "",
    description: auditLogInput.description ?? "",
    targets: auditLogInput.targets ? JSON.stringify(auditLogInput.targets) : "",
    metadata: auditLogInput.metadata
      ? JSON.stringify(auditLogInput.metadata)
      : "",
    ip_address: ipAddress ?? "",
    user_agent: userAgent ?? "",
  };
};

export const recordAuditLog = async (data: AuditLogInput | AuditLogInput[]) => {
  const auditLogs = Array.isArray(data)
    ? data.map(transformAuditLogTB)
    : [transformAuditLogTB(data)];

  try {
    await recordAuditLogTB(auditLogs);
  } catch (error) {
    console.error(
      "Failed to record audit log",
      error,
      JSON.stringify(auditLogs),
    );

    await log({
      message: "Failed to record audit log. See logs for more details.",
      type: "errors",
      mention: true,
    });
  }
};

const recordAuditLogTB = tb.buildIngestEndpoint({
  datasource: "dub_audit_logs",
  event: auditLogSchemaTB,
  wait: true,
});
