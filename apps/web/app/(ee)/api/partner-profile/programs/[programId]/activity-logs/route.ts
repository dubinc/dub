import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  activityLogSchema,
  getActivityLogsQuerySchema,
} from "@/lib/zod/schemas/activity-log";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { resourceType, resourceId, action } =
      getActivityLogsQuerySchema.parse(searchParams);

    // Limit to referral for now
    if (resourceType !== "referral") {
      throw new DubApiError({
        code: "bad_request",
        message: "Resource type must be referral.",
      });
    }

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: params.programId,
      include: {},
    });

    // Check if the resource is a referral and belongs to the program and partner
    if (resourceType === "referral") {
      const referral = await prisma.partnerReferral.findUnique({
        where: {
          id: resourceId,
          programId: programEnrollment.programId,
          partnerId: partner.id,
        },
        select: {
          id: true,
        },
      });

      if (!referral) {
        throw new DubApiError({
          code: "not_found",
          message: "Referral not found.",
        });
      }
    }

    const activityLogs = await prisma.activityLog.findMany({
      where: {
        programId: programEnrollment.programId,
        resourceType,
        resourceId,
        action,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 100,
    });

    return NextResponse.json(z.array(activityLogSchema).parse(activityLogs));
  },
);
