// TODO:
// Should track operations on both API endpoints and server actions.
// Obscure data such as API keys, passwords, etc.
// Catch the error and report it

import { tb } from "@/lib/tinybird";
import { nanoid } from "@dub/utils";
import { z } from "zod";
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
  const ip = "";
  const user_agent = "";

  const auditLogTB = {
    ...auditLog,
    id: nanoid(),
    ip,
    user_agent,
    timestamp: new Date().toISOString(),
  };

  console.log("Recording audit log:", auditLogTB);

  await recordAuditLogTB(auditLogTB).catch((error) => {
    console.error("Failed to record audit log:", error);
  });
};
