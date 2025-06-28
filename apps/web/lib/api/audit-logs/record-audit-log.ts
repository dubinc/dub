import { tb } from "@/lib/tinybird";
import { ipAddress } from "@vercel/functions";
import { headers } from "next/headers";
import { z } from "zod";
import { createId } from "../create-id";
import { getIP } from "../utils";
import { auditLogSchemaTB, recordAuditLogInputSchema } from "./schemas";

export const recordAuditLogTB = tb.buildIngestEndpoint({
  datasource: "dub_audit_logs",
  event: auditLogSchemaTB,
  wait: true,
});

// TODO:
// Support array of logs
export const recordAuditLog = async (
  data: z.infer<typeof recordAuditLogInputSchema>,
) => {
  const headersList = headers();
  const location = data.req ? ipAddress(data.req) : getIP();
  const userAgent = headersList.get("user-agent");

  const auditLog: z.infer<typeof auditLogSchemaTB> = {
    id: createId({ prefix: "audit_" }),
    timestamp: new Date().toISOString(),
    workspace_id: data.workspaceId,
    program_id: data.programId,
    action: data.action,
    actor_id: data.actor.id,
    actor_type: data.actor.type || "user",
    actor_name: data.actor.name || "",
    description: data.description || "",
    location: location || "",
    user_agent: userAgent || "",
    targets: data.targets ? JSON.stringify(data.targets) : "",
    metadata: data.metadata ? JSON.stringify(data.metadata) : "",
  };

  if (process.env.NODE_ENV === "development") {
    console.info("Inserting audit log", auditLog);
    return;
  }

  await recordAuditLogTB(auditLog).catch((error) => {
    console.error("Failed to record audit log", error);
  });
};
