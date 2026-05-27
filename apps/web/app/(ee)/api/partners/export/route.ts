import { convertToCSV } from "@/lib/analytics/utils/convert-to-csv";
import { formatPartnersForExport } from "@/lib/api/partners/format-partners-for-export";
import { getPartners } from "@/lib/api/partners/get-partners";
import { getPartnersCount } from "@/lib/api/partners/get-partners-count";
import { parsePartnerListQuery } from "@/lib/api/partners/parse-partner-filter-params";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { partnersExportQuerySchema } from "@/lib/zod/schemas/partners";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

const MAX_PARTNERS_TO_EXPORT = 1000;

// GET /api/partners/export – export partners to CSV
export const GET = withWorkspace(
  async ({ searchParams, workspace, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const params = parsePartnerListQuery(
      searchParams,
      partnersExportQuerySchema,
    );
    const { columns, ...filters } = params;

    const partnersCount = await getPartnersCount<number>({
      ...filters,
      groupBy: undefined,
      programId,
    });

    if (partnersCount > MAX_PARTNERS_TO_EXPORT) {
      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/export/partners`,
        body: {
          ...params,
          columns: columns.join(","),
          programId,
          userId: session.user.id,
        },
      });

      return NextResponse.json({}, { status: 202 });
    }

    const partners = await getPartners({
      ...filters,
      page: 1,
      pageSize: MAX_PARTNERS_TO_EXPORT,
      programId,
    });

    const formattedPartners = formatPartnersForExport(partners, columns);

    return new Response(convertToCSV(formattedPartners), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment",
      },
    });
  },
  {
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);
