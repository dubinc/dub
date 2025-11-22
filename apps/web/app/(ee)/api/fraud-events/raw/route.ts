import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { rawFraudEventsQuerySchema } from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/fraud-events/raw - Get individual fraud events within a group
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { groupKey } = rawFraudEventsQuerySchema.parse(searchParams);

    const fraudEvents = await prisma.fraudEvent.findMany({
      where: {
        programId,
        groupKey,
      },
      include: {
        partner: true,
        customer: true,
        commission: true,
      },
    });

    if (fraudEvents.length === 0) {
      return NextResponse.json([]);
    }

    const { type, partner } = fraudEvents[0];

    if (type === "partnerCrossProgramBan") {
      const bannedProgramEnrollments = await prisma.programEnrollment.findMany({
        where: {
          partnerId: partner.id,
          programId: {
            not: programId,
          },
          status: "banned",
        },
        select: {
          bannedAt: true,
          bannedReason: true,
        },
      });

      return NextResponse.json(bannedProgramEnrollments);
    }

    if (type === "partnerDuplicatePayoutMethod") {
      const duplicatePartners = await prisma.programEnrollment.findMany({
        where: {
          partnerId: partner.id,
          programId,
          partner: {
            payoutMethodHash: partner.payoutMethodHash,
          },
        },
        select: {
          partner: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              updatedAt: true,
            },
          },
        },
      });

      return NextResponse.json(duplicatePartners);
    }

    return NextResponse.json(fraudEvents);
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
