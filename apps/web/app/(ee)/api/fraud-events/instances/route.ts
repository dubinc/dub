import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { fraudEventInstancesQuerySchema } from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/fraud-events/instances - Get individual fraud events filtered by partnerId and type
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { partnerId, type } =
      fraudEventInstancesQuerySchema.parse(searchParams);

    const fraudEvents = await prisma.fraudEvent.findMany({
      where: {
        programId,
        partnerId,
        type,
      },
      include: {
        partner: true,
        customer: true,
        commission: true,
      },
    });

    if (fraudEvents.length > 0 && type === "partnerCrossProgramBan") {
      const bannedProgramEnrollments = await prisma.programEnrollment.findMany({
        where: {
          partnerId,
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

    if (fraudEvents.length > 0 && type === "partnerDuplicatePayoutMethod") {
      const partner = fraudEvents[0].partner;

      const duplicatePartners = await prisma.programEnrollment.findMany({
        where: {
          partnerId,
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
