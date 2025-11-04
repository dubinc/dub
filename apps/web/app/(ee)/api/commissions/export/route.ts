import { convertToCSV } from "@/lib/analytics/utils";
import { formatCommissionsForExport } from "@/lib/api/commissions/format-commissions-for-export";
import { getCommissions } from "@/lib/api/commissions/get-commissions";
import { getCommissionsCount } from "@/lib/api/commissions/get-commissions-count";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { commissionsExportQuerySchema } from "@/lib/zod/schemas/commissions";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

const MAX_COMMISSIONS_TO_EXPORT = 1000;

// GET /api/commissions/export – export commissions to CSV
export const GET = withWorkspace(
  async ({ searchParams, workspace, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const parsedParams = commissionsExportQuerySchema.parse(searchParams);
    let { columns, ...filters } = parsedParams;

    // Get the count of commissions to decide if we should process async
    const counts = await getCommissionsCount({
      ...filters,
      programId,
    });

    // Process the export in the background if the number of commissions is greater than MAX_COMMISSIONS_TO_EXPORT
    if (counts.all.count > MAX_COMMISSIONS_TO_EXPORT) {
      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/commissions/export`,
        body: {
          ...parsedParams,
          columns: columns.join(","),
          programId,
          userId: session.user.id,
        },
      });

      return NextResponse.json({}, { status: 202 });
    }

    // Find commissions that match the filters
    const commissions = await getCommissions({
      ...filters,
      programId,
      page: 1,
      pageSize: MAX_COMMISSIONS_TO_EXPORT,
      includeProgramEnrollment: true,
    });

    const formattedCommissions = formatCommissionsForExport(
      commissions,
      columns,
    );

    return new Response(convertToCSV(formattedCommissions), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment",
      },
    });
  },
);
