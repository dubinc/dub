import { convertToCSV } from "@/lib/analytics/utils";
import { getAuditLogs } from "@/lib/api/audit-logs/get-audit-logs";
import { auditLogExportQuerySchema } from "@/lib/api/audit-logs/schemas";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";

// POST /api/audit-logs/export – export audit logs to CSV
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    const { start, end } = auditLogExportQuerySchema.parse(
      await parseRequestBody(req),
    );

    const program = await prisma.program.findFirst({
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
    const fileName = `${workspace.name}_audit_logs.csv`;

    return new Response(csvData, {
      headers: {
        "Content-Type": "application/csv",
        "Content-Disposition": `attachment; filename=${fileName}`,
      },
    });
  },
  {
    requiredPermissions: ["workspaces.write"],
    requiredPlan: ["enterprise"],
  },
);
