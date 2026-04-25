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

// GET /api/applications/events – list application events for the workspace's default program
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
    page,
    pageSize,
    sortBy,
    sortOrder,
  } = applicationEventsQuerySchema.parse(searchParams);

  const where: Prisma.ProgramApplicationEventWhereInput = {
    programId,
    ...(partnerId && { partnerId }),
    ...(country && { country }),
    ...(referralSource && { referralSource }),
    ...(groupId && { application: { groupId } }),
    // visitedAt is always set (non-null), so "visited" needs no filter
    ...(event === "started" && { startedAt: { not: null } }),
    ...(event === "submitted" && { submittedAt: { not: null } }),
    ...(event === "approved" && { approvedAt: { not: null } }),
    ...(event === "rejected" && { rejectedAt: { not: null } }),
    ...((start || end) && {
      visitedAt: {
        ...(start && { gte: start }),
        ...(end && { lte: end }),
      },
    }),
  };

  const rows = await prisma.programApplicationEvent.findMany({
    where,
    orderBy: {
      [sortBy]: sortOrder,
    },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      country: true,
      referralSource: true,
      referredByPartnerId: true,
      visitedAt: true,
      startedAt: true,
      submittedAt: true,
      approvedAt: true,
      rejectedAt: true,
      programEnrollment: {
        select: {
          partner: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
      application: {
        select: {
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

  const events = rows.map(({ programEnrollment, application, ...rest }) => ({
    ...rest,
    partner: programEnrollment?.partner ?? null,
    group: application?.partnerGroup ?? null,
  }));

  return NextResponse.json(z.array(applicationEventSchema).parse(events));
});
