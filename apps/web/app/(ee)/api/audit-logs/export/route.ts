import { convertToCSV } from "@/lib/analytics/utils";
import { getAuditLogs } from "@/lib/api/audit-logs/get-audit-logs";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { z } from "zod";

const auditLogExportQuerySchema = z.object({
  start: z.string(),
  end: z.string(),
});

// POST /api/audit-logs/export – export audit logs to CSV
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    const { start, end } = auditLogExportQuerySchema.parse(
      await parseRequestBody(req),
    );

    if (!start || !end) {
      throw new DubApiError({
        code: "bad_request",
        message: "Must provide start and end dates.",
      });
    }

    const { canExportAuditLogs } = getPlanCapabilities(workspace.plan);

    if (!canExportAuditLogs) {
      throw new DubApiError({
        code: "forbidden",
        message: "You are not authorized to export audit logs.",
      });
    }

    const programId = getDefaultProgramIdOrThrow(workspace);

    const auditLogs = await getAuditLogs({
      workspaceId: workspace.id,
      programId,
      start: new Date(start),
      end: new Date(end),
    });

    const csvData = convertToCSV(auditLogs);

    return new Response(csvData, {
      headers: {
        "Content-Type": "application/csv",
        "Content-Disposition": `attachment;`,
      },
    });
  },
  {
    requiredPermissions: ["workspaces.write"],
    requiredPlan: ["enterprise"],
  },
);
