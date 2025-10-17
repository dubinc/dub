import { convertToCSV } from "@/lib/analytics/utils";
import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  COMMISSION_EXPORT_COLUMNS,
  commissionsExportQuerySchema,
  getCommissionsQuerySchema,
} from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { z } from "zod";

const COLUMN_LOOKUP: Map<
  string,
  { label: string; type: string; order: number }
> = new Map(
  COMMISSION_EXPORT_COLUMNS.map((column, index) => [
    column.id,
    {
      label: column.label,
      type: column.type,
      order: index + 1,
    },
  ]),
);

// Define the Zod schemas for each column type
const COLUMN_TYPE_SCHEMAS = {
  number: z.coerce
    .number()
    .nullable()
    .default(0)
    .transform((value) => value || 0),
  date: z.date().transform((date) => date?.toISOString() || ""),
  string: z
    .string()
    .nullable()
    .default("")
    .transform((value) => value || ""),
};

// GET /api/commissions/export – export commissions to CSV
export const GET = withWorkspace(async ({ searchParams, workspace }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  let { columns, ...filters } =
    commissionsExportQuerySchema.parse(searchParams);

  // Parse the search filters
  const {
    status,
    type,
    customerId,
    payoutId,
    partnerId,
    groupId,
    invoiceId,
    sortBy,
    sortOrder,
    start,
    end,
    interval,
  } = getCommissionsQuerySchema.parse(filters);

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
  });

  // Find commissions that match the filters
  const commissions = await prisma.commission.findMany({
    where: invoiceId
      ? {
          invoiceId,
          programId,
        }
      : {
          earnings: {
            not: 0,
          },
          programId,
          partnerId,
          status,
          type,
          customerId,
          payoutId,
          createdAt: {
            gte: startDate.toISOString(),
            lte: endDate.toISOString(),
          },
          ...(groupId && {
            partner: {
              programs: {
                some: {
                  programId,
                  groupId,
                },
              },
            },
          }),
        },
    include: {
      customer: {
        select: {
          name: true,
          email: true,
          externalId: true,
        },
      },
      partner: {
        select: {
          name: true,
          email: true,
          programs: {
            select: {
              tenantId: true,
            },
            where: {
              programId,
            },
          },
        },
      },
    },
    take: 1000,
    orderBy: {
      [sortBy]: sortOrder,
    },
  });

  // Format the commissions
  const formattedCommissions = commissions.map((commission) => ({
    ...commission,
    customerName: commission.customer?.name || "",
    customerEmail: commission.customer?.email || "",
    customerExternalId: commission.customer?.externalId || "",
    partnerName: commission.partner?.name || "",
    partnerEmail: commission.partner?.email || "",
    partnerTenantId: commission.partner?.programs[0]?.tenantId || "",
  }));

  // Sort columns by their order
  columns = columns.sort(
    (a, b) =>
      (COLUMN_LOOKUP.get(a)?.order || 999) -
      (COLUMN_LOOKUP.get(b)?.order || 999),
  );

  // Build column schemas
  const columnSchemas: Record<string, z.ZodTypeAny> = {};

  for (const column of columns) {
    const columnInfo = COLUMN_LOOKUP.get(column);

    if (!columnInfo) {
      continue;
    }

    columnSchemas[column] = COLUMN_TYPE_SCHEMAS[columnInfo.type];
  }

  // Prepare the data for export
  const data = z.array(z.object(columnSchemas)).parse(formattedCommissions);
  const csvData = convertToCSV(data);

  // Sanitize timestamp for filesystem compatibility (replace colons with hyphens)
  const sanitizedTimestamp = new Date().toISOString().replace(/:/g, "-");

  return new Response(csvData, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="Dub Commissions Export - ${sanitizedTimestamp}.csv"`,
    },
  });
});
