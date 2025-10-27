import { convertToCSV } from "@/lib/analytics/utils";
import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { formatCommissionsForExport } from "@/lib/api/commissions/format-commissions-for-export";
import { getCommissionsCount } from "@/lib/api/commissions/get-commissions-count";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import {
  commissionsExportQuerySchema,
  getCommissionsQuerySchema,
} from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

const MAX_COMMISSIONS_TO_EXPORT = 1000;

// GET /api/commissions/export – export commissions to CSV
export const GET = withWorkspace(async ({ searchParams, workspace, session }) => {
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

  // Parse the search filters for synchronous export
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
    take: MAX_COMMISSIONS_TO_EXPORT,
    orderBy: {
      [sortBy]: sortOrder,
    },
  });

  const formattedCommissions = formatCommissionsForExport(commissions, columns);
  const csvData = convertToCSV(formattedCommissions);

  return new Response(csvData, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment",
    },
  });
});
