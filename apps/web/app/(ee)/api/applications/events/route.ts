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

  console.log({
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
  });

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
    ...(groupId && { programEnrollment: { groupId } }),
    ...(event === "visited" && {
      visitedAt: {
        gte: startDate,
        lt: endDate,
      },
    }),
    ...(event === "started" && {
      startedAt: {
        gte: startDate,
        lt: endDate,
      },
    }),
    ...(event === "submitted" && {
      submittedAt: {
        gte: startDate,
        lt: endDate,
      },
    }),
    ...(event === "approved" && {
      approvedAt: {
        gte: startDate,
        lt: endDate,
      },
    }),
    ...(event === "rejected" && {
      rejectedAt: {
        gte: startDate,
        lt: endDate,
      },
    }),
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
