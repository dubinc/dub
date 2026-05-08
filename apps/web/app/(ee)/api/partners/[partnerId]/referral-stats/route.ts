import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withWorkspace } from "@/lib/auth";
import { partnerReferralStatsSchema } from "@/lib/partner-referrals/schemas";
import { prisma } from "@dub/prisma";
import { toCentsNumber } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/partners/:partnerId/referral-stats – get referral link stats for a partner
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { partnerId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      include: {},
    });

    const applicationEvents = await prisma.programApplicationEvent.findMany({
      where: {
        programId,
        referredByPartnerId: partnerId,
        partnerId: {
          not: null,
        },
      },
      select: {
        programEnrollment: {
          select: {
            totalConversions: true,
            totalSaleAmount: true,
          },
        },
      },
    });

    const totalConversions = applicationEvents.reduce(
      (acc, event) => acc + (event.programEnrollment?.totalConversions ?? 0),
      0,
    );

    const totalSaleAmount = applicationEvents.reduce(
      (acc, event) =>
        acc + toCentsNumber(event.programEnrollment?.totalSaleAmount ?? 0),
      0,
    );

    return NextResponse.json(
      partnerReferralStatsSchema.parse({
        totalPartners: applicationEvents.length,
        totalConversions,
        totalSaleAmount,
      }),
    );
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);
