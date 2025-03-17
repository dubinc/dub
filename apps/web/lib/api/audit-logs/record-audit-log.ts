import { tb } from "@/lib/tinybird";
import { nanoid } from "@dub/utils";
import { ipAddress } from "@vercel/functions";
import { headers } from "next/headers";
import { z } from "zod";
import { getIP } from "../utils";
import { CreateAuditLogEvent, auditLogSchema } from "./schemas";

export const recordAuditLogTB = tb.buildIngestEndpoint({
  datasource: "dub_audit_logs",
  event: auditLogSchema,
  wait: true,
});

export const recordAuditLog = async (params: CreateAuditLogEvent) => {
  const headersList = headers();
  const ip = params.req ? ipAddress(params.req) : getIP();
  const ua = headersList.get("user-agent");

  const auditLogTB: z.infer<typeof auditLogSchema> = {
    id: nanoid(),
    workspace_id: params.workspaceId,
    program_id: params.programId,
    action: params.event.type,
    actor_type: params.actor.type,
    actor_id: params.actor.id,
    actor_name: params.actor.name,
    description: params.description || "",
    ip: ip || "",
    user_agent: ua || "",
    timestamp: new Date().toISOString(),
    metadata: params.event.metadata,
  };

  if (process.env.NODE_ENV === "development") {
    console.log("Audit log:", auditLogTB);
  }

  await recordAuditLogTB(auditLogTB).catch((error) => {
    console.error("Failed to record audit log:", error);
  });
};
