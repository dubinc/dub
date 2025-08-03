import { convertToCSV } from "@/lib/analytics/utils";
import { withWorkspace } from "@/lib/auth";
import { getImportErrorLogs } from "@/lib/tinybird/get-import-error-logs";

// GET /api/workspaces/[idOrSlug]/import/[importId]/download - download the import logs as CSV
export const GET = withWorkspace(async ({ workspace, params }) => {
  const { importId } = params;

  const importErrorLogs = await getImportErrorLogs({
    workspaceId: workspace.id,
    importId,
  });

  const csvData = convertToCSV(
    importErrorLogs.data.map((log) => ({
      entity: log.entity,
      entityId: log.entity_id,
      code: log.code,
      message: log.message,
    })),
  );

  return new Response(csvData, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=import_error_logs_${importId}.csv`,
    },
  });
});
