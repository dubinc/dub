import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { hidePartnerSaleAmount } from "@/lib/partners/hide-partner-revenue";
import { PartnerProfileProgramEnrollmentSchema } from "@/lib/zod/schemas/partner-profile";
import { Reward } from "@prisma/client";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId] – get a partner's enrollment in a program
export const GET = withPartnerProfile(async ({ partner, params }) => {
  const programEnrollment = await getProgramEnrollmentOrThrow({
    partnerId: partner.id,
    programId: params.programId,
    include: {
      program: true,
      partner: true,
      links: true,
      clickReward: true,
      leadReward: true,
      saleReward: true,
      referralReward: true,
      customReward: true,
      discount: true,
      partnerGroup: true,
      application: {
        select: {
          rejectionReason: true,
          rejectionNote: true,
          reviewedAt: true,
        },
      },
    },
  });

  const rewards = [
    programEnrollment.clickReward,
    programEnrollment.leadReward,
    programEnrollment.saleReward,
    programEnrollment.referralReward,
    programEnrollment.customReward,
  ].filter((r): r is Reward => r !== null);

  const { partnerGroup } = programEnrollment;

  return NextResponse.json(
    PartnerProfileProgramEnrollmentSchema.parse({
      ...programEnrollment,
      links: programEnrollment.links?.map((link) =>
        hidePartnerSaleAmount(link, partnerGroup),
      ),
      rewards,
      group: partnerGroup,
      application: programEnrollment.application
        ? {
            rejectionReason: programEnrollment.application.rejectionReason,
            rejectionNote: programEnrollment.application.rejectionNote,
            reviewedAt: programEnrollment.application.reviewedAt,
          }
        : null,
    }),
  );
});
