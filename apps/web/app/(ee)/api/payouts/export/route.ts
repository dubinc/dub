import { convertToCSV } from "@/lib/analytics/utils";
import { formatPayoutsForExport } from "@/lib/api/payouts/format-payouts-for-export";
import { getPayouts, getPayoutsCount } from "@/lib/api/payouts/get-payouts";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { payoutsExportQuerySchema } from "@/lib/zod/schemas/payouts";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

const MAX_PAYOUTS_TO_EXPORT = 1000;

// GET /api/payouts/export – export payouts to CSV
export const GET = withWorkspace(
  async ({ searchParams, workspace, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const parsedParams = payoutsExportQuerySchema.parse(searchParams);
    const { columns, ...filters } = parsedParams;

    const count = await getPayoutsCount({
      programId,
      filters,
    });

    if (count > MAX_PAYOUTS_TO_EXPORT) {
      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/export/payouts`,
        body: {
          ...filters,
          columns: columns.join(","),
          workspaceId: workspace.id,
          programId,
          userId: session.user.id,
        },
      });

      return NextResponse.json({}, { status: 202 });
    }

    const payouts = await getPayouts({
      workspaceId: workspace.id,
      programId,
      filters: {
        ...filters,
        pageSize: MAX_PAYOUTS_TO_EXPORT,
      },
    });

    const rows = formatPayoutsForExport(payouts, columns);

    return new Response(convertToCSV(rows), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment",
      },
    });
  },
);
