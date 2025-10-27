import { convertToCSV } from "@/lib/analytics/utils/convert-to-csv";
import { getPartners } from "@/lib/api/partners/get-partners";
import { getPartnersCount } from "@/lib/api/partners/get-partners-count";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import {
  exportPartnerColumns,
  partnersExportQuerySchema,
} from "@/lib/zod/schemas/partners";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const columnIdToLabel = exportPartnerColumns.reduce((acc, column) => {
  acc[column.id] = column.label;
  return acc;
}, {});

const numericColumns = exportPartnerColumns
  .filter((column) => column.numeric)
  .map((column) => column.id);

const MAX_PARTNERS_TO_EXPORT = 1000;

// GET /api/partners/export – export partners to CSV
export const GET = withWorkspace(
  async ({ searchParams, workspace }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const parsedParams = partnersExportQuerySchema.parse(searchParams);
    let { columns, ...filters } = parsedParams;

    const partnersCount = await getPartnersCount<number>({
      ...filters,
      groupBy: undefined,
      programId,
    });

    // Process the export in the background if the number of partners is greater than MAX_PARTNERS_TO_EXPORT
    if (partnersCount > MAX_PARTNERS_TO_EXPORT) {
      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/partners/export`,
        body: {
          ...parsedParams,
          programId,
        },
      });

      return NextResponse.json({}, { status: 204 });
    }

    const partners = await getPartners({
      ...filters,
      page: 1,
      pageSize: MAX_PARTNERS_TO_EXPORT,
      programId,
    });

    const columnOrderMap = exportPartnerColumns.reduce((acc, column, index) => {
      acc[column.id] = index + 1;
      return acc;
    }, {});

    columns = columns.sort(
      (a, b) => (columnOrderMap[a] || 999) - (columnOrderMap[b] || 999),
    );

    const schemaFields = {};
    columns.forEach((column) => {
      if (numericColumns.includes(column)) {
        schemaFields[columnIdToLabel[column]] = z.coerce
          .number()
          .optional()
          .default(0);
      } else {
        schemaFields[columnIdToLabel[column]] = z
          .string()
          .optional()
          .default("");
      }
    });

    const formattedPartners = partners.map((partner) => {
      const result = {};

      columns.forEach((column) => {
        let value = partner[column] || "";

        // Handle date fields - convert to ISO string format
        if (
          (column === "createdAt" || column === "payoutsEnabledAt") &&
          value instanceof Date
        ) {
          value = value.toISOString();
        }

        result[columnIdToLabel[column]] = value;
      });

      return z.object(schemaFields).parse(result);
    });

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
