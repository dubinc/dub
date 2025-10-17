import { convertToCSV } from "@/lib/analytics/utils/convert-to-csv";
import { getPartners } from "@/lib/api/partners/get-partners";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  exportPartnerColumns,
  partnersExportQuerySchema,
} from "@/lib/zod/schemas/partners";
import { z } from "zod";

const columnIdToLabel = exportPartnerColumns.reduce((acc, column) => {
  acc[column.id] = column.label;
  return acc;
}, {});

const numericColumns = exportPartnerColumns
  .filter((column) => column.numeric)
  .map((column) => column.id);

// GET /api/partners/export – export partners to CSV
export const GET = withWorkspace(
  async ({ searchParams, workspace }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    let { columns, ...filters } = partnersExportQuerySchema.parse(searchParams);

    const partners = await getPartners({
      ...filters,
      page: 1,
      pageSize: 10000,
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
