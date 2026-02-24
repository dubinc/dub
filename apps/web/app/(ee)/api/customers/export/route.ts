import { convertToCSV } from "@/lib/analytics/utils";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { buildCustomerCountWhere } from "@/lib/customers/api/customer-count-where";
import { getCustomers } from "@/lib/customers/api/get-customers";
import { formatCustomersForExport } from "@/lib/customers/export/format-customers-export";
import { customersExportQuerySchema } from "@/lib/customers/export/schema";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

const MAX_CUSTOMERS_TO_EXPORT = 1000;

export const GET = withWorkspace(
  async ({ searchParams, workspace, session }) => {
    const parsedFilters = customersExportQuerySchema.parse(searchParams);

    let { programId, partnerId, columns, ...filters } = parsedFilters;

    if (programId || partnerId) {
      programId = getDefaultProgramIdOrThrow(workspace);
    }

    const where = buildCustomerCountWhere({
      ...parsedFilters,
      workspaceId: workspace.id,
      programId,
    });

    const count = await prisma.customer.count({
      where,
    });

    if (count > MAX_CUSTOMERS_TO_EXPORT) {
      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/export/customers`,
        body: {
          ...parsedFilters,
          workspaceId: workspace.id,
          programId,
          userId: session.user.id,
          columns: columns.join(","),
        },
      });

      return NextResponse.json({}, { status: 202 });
    }

    const customers = await getCustomers({
      ...parsedFilters,
      workspaceId: workspace.id,
      programId,
      page: 1,
      pageSize: MAX_CUSTOMERS_TO_EXPORT,
    });

    const rows = formatCustomersForExport(customers, columns);

    return new Response(convertToCSV(rows), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment",
      },
    });
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);
