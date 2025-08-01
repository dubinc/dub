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

    const {
      status,
      type,
      page,
      pageSize,
      start,
      end,
      interval,
      partnerId,
      fraudEventId,
    } = getFraudEventsQuerySchema.parse(searchParams);

    const { startDate, endDate } = getStartEndDates({
      interval,
      start,
      end,
    });

    const fraudEvents = await prisma.fraudEvent.findMany({
      where: {
        ...(fraudEventId && { id: fraudEventId }),
        programId,
        ...(status && { status }),
        ...(type && {
          ...(type === "selfReferral" && { selfReferral: true }),
          ...(type === "googleAdsClick" && { googleAdsClick: true }),
          ...(type === "disposableEmail" && { disposableEmail: true }),
        }),
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
      orderBy: {
        createdAt: "desc",
      },
      take: pageSize,
      skip: (page! - 1) * pageSize!,
    });

    console.log(fraudEvents);

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
