import { tb } from "@/lib/tinybird";
import { ipAddress } from "@vercel/functions";
import { headers } from "next/headers";
import { z } from "zod";
import { createId } from "../create-id";
import { getIP } from "../utils";
import { auditLogSchemaTB, recordAuditLogInputSchema } from "./schemas";

const ENABLE_AUDIT_LOGS = true;

// TODO:
// Support array of logs
export const recordAuditLog = async (
  data: z.infer<typeof recordAuditLogInputSchema>,
) => {
  const headersList = headers();
  const location = data.req ? ipAddress(data.req) : getIP();
  const userAgent = headersList.get("user-agent");

  const auditLogInput = recordAuditLogInputSchema.parse({
    ...data,
    location,
    userAgent,
  });

  const auditLog: z.infer<typeof auditLogSchemaTB> = {
    id: createId({ prefix: "audit_" }),
    timestamp: new Date().toISOString(),
    workspace_id: auditLogInput.workspaceId,
    program_id: auditLogInput.programId,
    action: auditLogInput.action,
    actor_id: auditLogInput.actor.id,
    actor_type: auditLogInput.actor.type || "user",
    actor_name: auditLogInput.actor.name || "",
    description: auditLogInput.description || "",
    targets: auditLogInput.targets ? JSON.stringify(auditLogInput.targets) : "",
    metadata: auditLogInput.metadata
      ? JSON.stringify(auditLogInput.metadata)
      : "",
    location: location || "",
    user_agent: userAgent || "",
  };

  if (!ENABLE_AUDIT_LOGS) {
    console.info(auditLog);
    return;
  }

  await recordAuditLogTB(auditLog).catch((error) => {
    console.error("Failed to record audit log", error, auditLog);

    // TODO:
    // Send a Slack notification
  });
};

const recordAuditLogTB = tb.buildIngestEndpoint({
  datasource: "dub_audit_logs",
  event: auditLogSchemaTB,
  wait: true,
});
