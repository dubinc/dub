import { convertToCSV } from "@/lib/analytics/utils/convert-to-csv";
import { getPartners } from "@/lib/api/partners/get-partners";
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

// GET /api/partners/export – export partners to CSV
export const GET = withWorkspace(
  async ({ searchParams, workspace }) => {
    const { programId } = searchParams;

    let { columns, ...filters } = partnersExportQuerySchema.parse(searchParams);

    const partners = await getPartners({
      ...filters,
      page: 1,
      pageSize: 5000,
      workspaceId: workspace.id,
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
      if (["clicks", "leads", "sales", "saleAmount"].includes(column)) {
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
        if (column === "payoutsEnabledAt" || column === "createdAt") {
          result[columnIdToLabel[column]] = partner[column]
            ? new Date(partner[column]).toISOString()
            : "";
        } else {
          result[columnIdToLabel[column]] = partner[column] || "";
        }
      });

      return z.object(schemaFields).parse(result);
    });

    return new Response(convertToCSV(formattedPartners), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment`,
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
