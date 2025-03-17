import { tb } from "@/lib/tinybird";
import { nanoid } from "@dub/utils";
import { ipAddress } from "@vercel/functions";
import { headers } from "next/headers";
import { z } from "zod";
import { getIP } from "../utils";
import { auditLogSchema, createAuditLogSchema } from "./schemas";

export const recordAuditLogTB = tb.buildIngestEndpoint({
  datasource: "dub_audit_logs",
  event: auditLogSchema,
  wait: true,
});

export const recordAuditLog = async (
  event: z.infer<typeof createAuditLogSchema> & {
    req?: Request;
  },
) => {
  const headersList = headers();
  const ip = event.req ? ipAddress(event.req) : getIP();
  const ua = headersList.get("user-agent");

  const auditLogTB: z.infer<typeof auditLogSchema> = {
    id: nanoid(),
    workspace_id: event.workspaceId,
    program_id: event.programId,
    action: event.event.type,
    actor_type: event.actorType || "user",
    actor_id: event.actorId,
    actor_name: event.actorName,
    description: event.description || "",
    ip: ip || "",
    user_agent: ua || "",
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === "development") {
    console.log("Audit log:", auditLogTB);
  }

  await recordAuditLogTB(auditLogTB).catch((error) => {
    console.error("Failed to record audit log:", error);
  });
};
