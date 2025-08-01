import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { fraudEventsCountQuerySchema } from "@/lib/zod/schemas/fraud-events";
import { prisma } from "@dub/prisma";
import { FraudEventStatus, Prisma } from "@dub/prisma/client";
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
      ...(type && {
        ...(type === "selfReferral" && { selfReferral: true }),
        ...(type === "googleAdsClick" && { googleAdsClick: true }),
        ...(type === "disposableEmail" && { disposableEmail: true }),
      }),
      createdAt: {
        gte: startDate.toISOString(),
        lte: endDate.toISOString(),
      },
    };

    // Get the count of fraud events by status
    if (groupBy === "status") {
      const fraudEvents = await prisma.fraudEvent.groupBy({
        by: [groupBy],
        where: commonWhere,
        _count: true,
      });

      const counts = fraudEvents.map((p) => ({
        status: p.status,
        count: p._count,
      }));

      Object.values(FraudEventStatus).forEach((status) => {
        if (!counts.find((p) => p.status === status)) {
          counts.push({
            status,
            count: 0,
          });
        }
      });

      return NextResponse.json(counts);
    }

    // Get the count of fraud events by type
    if (groupBy === "type") {
      const fraudEvents = await prisma.fraudEvent.findMany({
        where: commonWhere,
        select: {
          selfReferral: true,
          googleAdsClick: true,
          disposableEmail: true,
        },
      });

      const counts = {
        selfReferral: 0,
        googleAdsClick: 0,
        disposableEmail: 0,
      };

      fraudEvents.forEach((event) => {
        if (event.selfReferral) {
          counts.selfReferral += 1;
        }

        if (event.googleAdsClick) {
          counts.googleAdsClick += 1;
        }

        if (event.disposableEmail) {
          counts.disposableEmail += 1;
        }
      });

      return NextResponse.json([
        { type: "selfReferral", count: counts.selfReferral },
        { type: "googleAdsClick", count: counts.googleAdsClick },
        { type: "disposableEmail", count: counts.disposableEmail },
      ]);
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
