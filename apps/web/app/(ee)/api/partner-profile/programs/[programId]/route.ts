import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { ProgramEnrollmentSchema } from "@/lib/zod/schemas/programs";
import { Reward } from "@dub/prisma/client";
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
  ].filter((r): r is Reward => r !== null);

  return NextResponse.json(
    ProgramEnrollmentSchema.parse({
      ...programEnrollment,
      rewards,
      group: programEnrollment.partnerGroup,
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
