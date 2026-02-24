import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  activityLogSchema,
  getActivityLogsQuerySchema,
} from "@/lib/zod/schemas/activity-log";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import * as z from "zod/v4";

// GET /api/activity-logs – get activity logs for a resource
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const { resourceType, resourceId, parentResourceId, action } =
    getActivityLogsQuerySchema.parse(searchParams);

  const programId = getDefaultProgramIdOrThrow(workspace);

  const activityLogs = await prisma.activityLog.findMany({
    where: {
      programId,
      resourceType,
      resourceId,
      parentResourceId,
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

  const parsedActivityLogs = z.array(activityLogSchema).parse(activityLogs);

  // polyfill first group change activity log based on program enrollment creation date
  if (resourceType === "partner" && resourceId) {
    const programEnrollment = await prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          partnerId: resourceId,
          programId,
        },
      },
      select: {
        createdAt: true,
        groupId: true,
        partnerGroup: {
          select: {
            name: true,
          },
        },
      },
    });
    if (programEnrollment) {
      parsedActivityLogs.push({
        id: uuid(),
        action: "partner.groupChanged",
        description: null,
        createdAt: programEnrollment.createdAt,
        user: null,
        changeSet: {
          group: {
            old: null,
            new: parsedActivityLogs[parsedActivityLogs.length - 1]?.changeSet
              ?.group.old ?? {
              id: programEnrollment.groupId,
              name: programEnrollment.partnerGroup?.name,
            },
          },
        },
      });
    }
  }

  return NextResponse.json(parsedActivityLogs);
});
