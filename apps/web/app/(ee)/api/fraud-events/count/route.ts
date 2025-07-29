import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { fraudEventsCountQuerySchema } from "@/lib/zod/schemas/fraud-events";
import { prisma } from "@dub/prisma";
import { FraudEventStatus, FraudEventType, Prisma } from "@dub/prisma/client";
import { NextResponse } from "next/server";

// GET /api/fraud-events/count - get the count of fraud events for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { groupBy, status, type, interval, start, end } =
      fraudEventsCountQuerySchema.parse(searchParams);

    const { startDate, endDate } = getStartEndDates({
      interval,
      start,
      end,
    });

    const commonWhere: Prisma.FraudEventWhereInput = {
      programId,
      ...(status && { status }),
      ...(type && { type }),
      createdAt: {
        gte: startDate.toISOString(),
        lte: endDate.toISOString(),
      },
    };

    // Get the count of fraud events by status
    if (groupBy === "status") {
      const counts = await prisma.fraudEvent.groupBy({
        by: [groupBy],
        where: commonWhere,
        _count: true,
      });

      Object.values(FraudEventStatus).forEach((status) => {
        if (!(status in counts)) {
          counts[status] = {
            count: 0,
          };
        }
      });

      return NextResponse.json(counts);
    }

    // Get the count of fraud events by type
    if (groupBy === "type") {
      const counts = await prisma.fraudEvent.groupBy({
        by: [groupBy],
        where: commonWhere,
        _count: true,
      });

      Object.values(FraudEventType).forEach((type) => {
        if (!(type in counts)) {
          counts[type] = {
            count: 0,
          };
        }
      });

      return NextResponse.json(counts);
    }

    // Get the total count of fraud events
    const count = await prisma.fraudEvent.count({
      where: commonWhere,
    });

    return NextResponse.json(count);
  },
  {
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);
