import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { determinePartnerDiscount } from "@/lib/partners/determine-partner-discount";
import { determinePartnerRewards } from "@/lib/partners/determine-partner-rewards";
import { ProgramEnrollmentSchema } from "@/lib/zod/schemas/programs";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId] – get a partner's enrollment in a program
export const GET = withPartnerProfile(async ({ partner, params }) => {
  const programEnrollment = await getProgramEnrollmentOrThrow({
    partnerId: partner.id,
    programId: params.programId,
  });

  const { partnerId, programId } = programEnrollment;

  const [rewards, discount] = await Promise.all([
    determinePartnerRewards({
      partnerId,
      programId,
    }),

    determinePartnerDiscount({
      partnerId,
      programId,
    }),
  ]);

  return NextResponse.json(
    ProgramEnrollmentSchema.parse({
      ...programEnrollment,
      rewards,
      discount,
    }),
  );
});
