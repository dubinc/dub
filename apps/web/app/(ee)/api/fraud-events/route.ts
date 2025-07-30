import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  FraudEventSchema,
  getFraudEventsQuerySchema,
} from "@/lib/zod/schemas/fraud-events";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/fraud-events - get all fraud events for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { status, type, page, pageSize, start, end, interval, partnerId } =
      getFraudEventsQuerySchema.parse(searchParams);

    const { startDate, endDate } = getStartEndDates({
      interval,
      start,
      end,
    });

    const fraudEvents = await prisma.fraudEvent.findMany({
      where: {
        programId,
        ...(status && { status }),
        ...(type && { type }),
        ...(partnerId && { partnerId }),
        createdAt: {
          gte: startDate.toISOString(),
          lte: endDate.toISOString(),
        },
      },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            payoutsEnabledAt: true,
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        link: {
          select: {
            id: true,
            url: true,
            shortLink: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        commissions: {
          select: {
            id: true,
            earnings: true,
          },
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(z.array(FraudEventSchema).parse(fraudEvents));
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
