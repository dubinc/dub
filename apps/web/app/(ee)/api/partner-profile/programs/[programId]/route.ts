import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { ProgramEnrollmentSchema } from "@/lib/zod/schemas/programs";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId] – get a partner's enrollment in a program
export const GET = withPartnerProfile(async ({ partner, params }) => {
  const programEnrollment = await getProgramEnrollmentOrThrow({
    partnerId: partner.id,
    programId: params.programId,
    includeRewards: true,
    includeDiscount: true,
  });

  const { rewards, discount } = programEnrollment;

  return NextResponse.json(
    ProgramEnrollmentSchema.parse({
      ...programEnrollment,
      rewards,
      discount,
    }),
  );
});
