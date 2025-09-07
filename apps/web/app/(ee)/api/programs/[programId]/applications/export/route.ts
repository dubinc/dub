import { convertToCSV } from "@/lib/analytics/utils/convert-to-csv";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  exportApplicationColumns,
  exportApplicationsColumnsDefault,
} from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { z } from "zod";

const columnIdToLabel = exportApplicationColumns.reduce((acc, column) => {
  acc[column.id] = column.label;
  return acc;
}, {});

const applicationsExportQuerySchema = z.object({
  columns: z
    .string()
    .optional()
    .transform((v) => v?.split(",") || exportApplicationsColumnsDefault)
    .default(exportApplicationsColumnsDefault.join(",")),
});

// GET /api/programs/[programId]/applications/export – export applications to CSV
export const GET = withWorkspace(
  async ({ searchParams, workspace }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    let { columns } = applicationsExportQuerySchema.parse(searchParams);

    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        programId,
        status: "pending",
      },
      include: {
        partner: true,
        application: true,
      },
    });

    const applications = programEnrollments.map(
      ({ partner, application, ...programEnrollment }) => {
        return {
          ...partner,
          createdAt: application?.createdAt || programEnrollment.createdAt,
          proposal: application?.proposal || "",
          comments: application?.comments || "",
        };
      },
    );

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
