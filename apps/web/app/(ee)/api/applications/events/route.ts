import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  applicationEventSchema,
  applicationEventsQuerySchema,
} from "@/lib/application-events/schema";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/applications/events – list application events
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const {
    groupId,
    partnerId,
    country,
    referralSource,
    event,
    start,
    end,
    interval,
    timezone,
    page,
    pageSize,
    sortBy,
    sortOrder,
  } = applicationEventsQuerySchema.parse(searchParams);

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
    timezone,
  });

  const where: Prisma.ProgramApplicationEventWhereInput = {
    programId,
    ...(partnerId && { partnerId }),
    ...(country && { country }),
    ...(referralSource && { referralSource }),
    ...(groupId && { application: { groupId } }),
    ...(event === "started" && { startedAt: { not: null } }),
    ...(event === "submitted" && { submittedAt: { not: null } }),
    ...(event === "approved" && { approvedAt: { not: null } }),
    ...(event === "rejected" && { rejectedAt: { not: null } }),
    visitedAt: {
      gte: startDate,
      lt: endDate,
    },
  };

  const programApplicationEvents =
    await prisma.programApplicationEvent.findMany({
      where,
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        programEnrollment: {
          select: {
            partner: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
            partnerGroup: {
              select: {
                id: true,
                name: true,
                slug: true,
                color: true,
              },
            },
          },
        },
      },
    });

  const response = programApplicationEvents.map(
    ({ programEnrollment, ...rest }) => ({
      ...rest,
      partner: programEnrollment?.partner ?? null,
      group: programEnrollment?.partnerGroup ?? null,
    }),
  );

  return NextResponse.json(z.array(applicationEventSchema).parse(response));
});
