import { tb } from "@/lib/tinybird";
import { nanoid } from "@dub/utils";
import { ipAddress } from "@vercel/functions";
import { headers } from "next/headers";
import { z } from "zod";
import { getIP } from "../utils";
import { AuditLogEvent, auditLogSchema, RecordAuditLog } from "./schemas-v2";

export const recordAuditLogTB = tb.buildIngestEndpoint({
  datasource: "dub_audit_logs",
  event: auditLogSchema,
  wait: true,
});

export const recordAuditLog = async (data: RecordAuditLog) => {
  const headersList = headers();
  const location = data.req ? ipAddress(data.req) : getIP();
  const userAgent = headersList.get("user-agent");

  const targets = z.array(AuditLogEvent).parse(data.targets);

  const auditLogTB: z.infer<typeof auditLogSchema> = {
    id: nanoid(),
    workspace_id: data.workspaceId,
    program_id: data.programId,
    event: data.event,
    actor_type: data.actor.type || "user",
    actor_id: data.actor.id,
    actor_name: data.actor.name || "",
    description: data.description || "",
    location: location || "",
    user_agent: userAgent || "",
    timestamp: new Date().toISOString(),
    targets: targets ? JSON.stringify(targets) : "",
  };

  if (process.env.NODE_ENV === "development") {
    console.log("Audit log:", auditLogTB);
  }

  await recordAuditLogTB(auditLogTB).catch((error) => {
    console.error("Failed to record audit log:", error);
  });
};
