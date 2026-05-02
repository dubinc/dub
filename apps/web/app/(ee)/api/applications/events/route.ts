import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { assertValidDateRangeForPlan } from "@/lib/api/utils/assert-valid-date-range-for-plan";
import {
  applicationEventSchema,
  applicationEventsQuerySchema,
} from "@/lib/application-events/schema";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { parseFilterValue } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/applications/events – list application events
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const {
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

  assertValidDateRangeForPlan({
    plan: workspace.plan,
    dataAvailableFrom: workspace.createdAt,
    interval,
    start,
    end,
  });

  const { startDate, endDate } = getStartEndDates({
    interval,
    start,
    end,
    timezone,
  });

  const partnerFilter = parseFilterValue(partnerId);
  const countryFilter = parseFilterValue(country);
  const referralSourceFilter = parseFilterValue(referralSource);

  const where: Prisma.ProgramApplicationEventWhereInput = {
    programId,
    ...(partnerFilter && {
      partnerId:
        partnerFilter.sqlOperator === "NOT IN"
          ? { notIn: partnerFilter.values }
          : { in: partnerFilter.values },
    }),
    ...(countryFilter && {
      country:
        countryFilter.sqlOperator === "NOT IN"
          ? { notIn: countryFilter.values }
          : { in: countryFilter.values },
    }),
    ...(referralSourceFilter && {
      referralSource:
        referralSourceFilter.sqlOperator === "NOT IN"
          ? { notIn: referralSourceFilter.values }
          : { in: referralSourceFilter.values },
    }),
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
