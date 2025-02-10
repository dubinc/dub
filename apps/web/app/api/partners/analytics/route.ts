import { getAnalytics } from "@/lib/analytics/get-analytics";
import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { getPartnerAnalyticsSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partners/analytics – get analytics for a partner
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const {
    groupBy,
    event,
    programId,
    partnerId,
    tenantId,
    interval,
    start,
    end,
    timezone,
  } = getPartnerAnalyticsSchema.parse(searchParams);

  if (!programId) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "Program ID not found. Did you forget to include a `programId` query parameter?",
    });
  }

  if (!partnerId && !tenantId) {
    throw new DubApiError({
      code: "bad_request",
      message: "You must provide a partnerId or tenantId.",
    });
  }

  const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
    where: partnerId
      ? { partnerId_programId: { partnerId, programId } }
      : { tenantId_programId: { tenantId: tenantId!, programId } },
    include: {
      program: true,
    },
  });

  if (programEnrollment.program.workspaceId !== workspace.id) {
    throw new DubApiError({
      code: "not_found",
      message: "Program not found.",
    });
  }

  const analytics = await getAnalytics({
    groupBy,
    event,
    programId,
    partnerId,
    interval,
    start,
    end,
    timezone,
  });

  return NextResponse.json(analytics);
});
