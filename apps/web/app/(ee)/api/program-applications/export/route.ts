import { convertToCSV } from "@/lib/analytics/utils/convert-to-csv";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { listProgramApplications } from "@/lib/program-applications/list-program-applications";
import { exportApplicationColumns } from "@/lib/zod/schemas/partners";
import { exportApplicationsQuerySchema } from "@/lib/zod/schemas/program-application";
import * as z from "zod/v4";

// Limitation: exports are capped at this many applications; any beyond it are silently dropped.
// TODO: In a follow-up PR, process larger exports in the background and email the CSV (like /api/partners/export).
const MAX_APPLICATIONS_TO_EXPORT = 2000;

const columnIdToLabel = exportApplicationColumns.reduce((acc, column) => {
  acc[column.id] = column.label;
  return acc;
}, {});

// GET /api/program-applications/export – export applications to CSV
export const GET = withWorkspace(
  async ({ searchParams, workspace }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    let { columns, status, groupId, country, sortOrder } =
      exportApplicationsQuerySchema.parse(searchParams);

    const programApplications = await listProgramApplications({
      programId,
      status,
      groupId,
      country,
      sortOrder,
      page: 1,
      pageSize: MAX_APPLICATIONS_TO_EXPORT,
    });

    const applications = programApplications.map(({ partner, createdAt }) => ({
      ...partner,
      createdAt,
    }));

    const columnOrderMap = exportApplicationColumns.reduce(
      (acc, column, index) => {
        acc[column.id] = index + 1;
        return acc;
      },
      {},
    );

    columns = columns.sort(
      (a, b) => (columnOrderMap[a] || 999) - (columnOrderMap[b] || 999),
    );

    const schemaFields = {};
    columns.forEach((column) => {
      schemaFields[columnIdToLabel[column]] = z.string().optional().default("");
    });

    const formattedApplications = applications.map((application) => {
      const result = {};

      columns.forEach((column) => {
        if (column === "createdAt") {
          result[columnIdToLabel[column]] = application[column]
            ? new Date(application[column]).toISOString()
            : "";
        } else {
          result[columnIdToLabel[column]] = application[column] || "";
        }
      });

      return z.object(schemaFields).parse(result);
    });

    return new Response(convertToCSV(formattedApplications), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment",
      },
    });
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);
