import { tb } from "@/lib/tinybird";
import { nanoid } from "@dub/utils";
import { ipAddress } from "@vercel/functions";
import { headers } from "next/headers";
import { z } from "zod";
import { getIP } from "../utils";
import { createAuditLogSchema } from "./schemas";

export const recordAuditLogTB = tb.buildIngestEndpoint({
  datasource: "dub_audit_logs",
  event: createAuditLogSchema,
  wait: true,
});

export const recordAuditLog = async (
  auditLog: z.input<typeof createAuditLogSchema> & {
    req?: Request;
  },
) => {
  const headersList = headers();
  const ip = auditLog.req ? ipAddress(auditLog.req) : getIP();
  const ua = headersList.get("user-agent");

  const auditLogTB = {
    ...auditLog,
    id: nanoid(),
    ...(ip && { ip }),
    ...(ua && { user_agent: ua }),
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === "development") {
    console.log("Audit log:", auditLogTB);
  }

  await recordAuditLogTB(auditLogTB).catch((error) => {
    console.error("Failed to record audit log:", error);
  });
};
