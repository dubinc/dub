import { tb } from "@/lib/tinybird";
import { nanoid } from "@dub/utils";
import { ipAddress } from "@vercel/functions";
import { headers } from "next/headers";
import { z } from "zod";
import { getIP } from "../utils";
import { auditLogSchemaTB } from "./schemas";

export const recordAuditLogTB = tb.buildIngestEndpoint({
  datasource: "dub_audit_logs",
  event: auditLogSchemaTB,
  wait: true,
});

export const recordAuditLog = async (
  auditLog: z.input<typeof auditLogSchemaTB> & {
    req?: Request;
  },
) => {
  const headersList = headers();

  const ip = auditLog.req ? ipAddress(auditLog.req) : getIP();
  const ua = headersList.get("user-agent");

  const auditLogTB = {
    ...auditLog,
    id: nanoid(),
    timestamp: new Date().toISOString(),
    ...(ip && { ip }),
    ...(ua && { user_agent: ua }),
  };

  console.log("Recording audit log:", auditLogTB);

  await recordAuditLogTB(auditLogTB).catch((error) => {
    console.error("Failed to record audit log:", error);
  });
};
