import { convertToCSV } from "@/lib/analytics/utils";
import { getAuditLogs } from "@/lib/api/audit-logs/get-audit-logs";
import { auditLogExportQuerySchema } from "@/lib/api/audit-logs/schemas";
import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";

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

    const program = await prisma.program.findFirstOrThrow({
      where: {
        workspaceId: workspace.id,
      },
      select: {
        id: true,
      },
    });

    const auditLogs = await getAuditLogs({
      workspaceId: workspace.id,
      ...(program?.id && { programId: program.id }),
      start,
      end,
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
