import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  applicationAnalyticsQuerySchema,
  applicationAnalyticsSchema,
} from "@/lib/application-events/schema";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";

const APPLICATION_GROUP_BY_CONFIG = {
  country: { column: "country" as const, via: "self" as const },
  referralSource: { column: "referralSource" as const, via: "self" as const },
} as const;

// GET /api/applications/analytics – aggregated application funnel counts for the workspace's default program
export const GET = withWorkspace(async ({ workspace, searchParams }) => {
  const programId = getDefaultProgramIdOrThrow(workspace);

  const { groupId, partnerId, country, referralSource, start, end, groupBy } =
    applicationAnalyticsQuerySchema.parse(searchParams);

  const where: Prisma.ProgramApplicationEventWhereInput = {
    programId,
    ...(partnerId && { partnerId }),
    ...(country && { country }),
    ...(referralSource && { referralSource }),
    ...(groupId && { application: { groupId } }),
    ...((start || end) && {
      visitedAt: {
        ...(start && { gte: start }),
        ...(end && { lte: end }),
      },
    }),
  };

  const aggregations = {
    _count: {
      visitedAt: true,
      startedAt: true,
      submittedAt: true,
      approvedAt: true,
      rejectedAt: true,
    },
  } as const;

  let payload: unknown;

  if (groupBy === "count") {
    const agg = await prisma.programApplicationEvent.aggregate({
      where,
      ...aggregations,
    });
    payload = formatCounts(agg._count);
  } else {
    const config = APPLICATION_GROUP_BY_CONFIG[groupBy];
    const rows = await prisma.programApplicationEvent.groupBy({
      by: [config.column],
      where,
      ...aggregations,
    });

    payload = rows.map((row) => ({
      [groupBy]: row[config.column],
      ...formatCounts(row._count),
    }));
  }

  return NextResponse.json(applicationAnalyticsSchema.parse(payload));
});

function formatCounts(c: {
  visitedAt: number;
  startedAt: number;
  submittedAt: number;
  approvedAt: number;
  rejectedAt: number;
}) {
  return {
    visits: c.visitedAt,
    starts: c.startedAt,
    submissions: c.submittedAt,
    approvals: c.approvedAt,
    rejections: c.rejectedAt,
  };
}
