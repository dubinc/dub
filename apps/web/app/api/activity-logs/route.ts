import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  activityLogSchema,
  getActivityLogsQuerySchema,
} from "@/lib/zod/schemas/activity-log";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/activity-logs – get activity logs for a resource
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const { resourceType, resourceId, action } =
    getActivityLogsQuerySchema.parse(searchParams);

  const programId = getDefaultProgramIdOrThrow(workspace);

  const activityLogs = await prisma.activityLog.findMany({
    where: {
      programId,
      resourceType,
      resourceId,
      action,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
    include: {
      user: true,
    },
  });

  return NextResponse.json(z.array(activityLogSchema).parse(activityLogs));
});
