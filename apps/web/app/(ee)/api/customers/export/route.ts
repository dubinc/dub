import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { qstash } from "@/lib/cron";
import { customersExportQuerySchema } from "@/lib/zod/schemas/customers";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/customers/export – export customers to CSV
export const GET = withWorkspace(
  async ({ searchParams, workspace, session }) => {
    const filters = customersExportQuerySchema.parse(searchParams);

    let { programId, partnerId, columns } = filters;

    if (programId || partnerId) {
      programId = getDefaultProgramIdOrThrow(workspace);
    }

    await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/export/customers`,
      body: {
        ...filters,
        workspaceId: workspace.id,
        programId,
        userId: session.user.id,
        columns: columns.join(","),
      },
    });

    return NextResponse.json({}, { status: 202 });
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
