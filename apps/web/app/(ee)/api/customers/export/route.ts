import { convertToCSV } from "@/lib/analytics/utils";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { buildCustomerCountWhere } from "@/lib/customers/api/customer-count-where";
import { formatCustomersForExport } from "@/lib/customers/api/format-customers-export";
import { getCustomers } from "@/lib/customers/api/get-customers";
import { prisma } from "@/lib/prisma";
import { customersExportQuerySchema } from "@/lib/zod/schemas/customers";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

const MAX_CUSTOMERS_TO_EXPORT = 1000;

// GET /api/customers/export – export customers to CSV
export const GET = withWorkspace(
  async ({ searchParams, workspace, session }) => {
    const filters = customersExportQuerySchema.parse(searchParams);

    const { columns } = filters;

    const where = buildCustomerCountWhere({
      ...filters,
      workspaceId: workspace.id,
    });

    const count = await prisma.customer.count({
      where,
    });

    if (count > MAX_CUSTOMERS_TO_EXPORT) {
      await qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/export/customers`,
        body: {
          ...filters,
          workspaceId: workspace.id,
          userId: session.user.id,
          columns: columns.join(","),
        },
      });

      return NextResponse.json({}, { status: 202 });
    }

    const customers = await getCustomers({
      ...filters,
      workspaceId: workspace.id,
      page: 1,
      pageSize: MAX_CUSTOMERS_TO_EXPORT,
      includeExpandedFields: true,
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
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);
