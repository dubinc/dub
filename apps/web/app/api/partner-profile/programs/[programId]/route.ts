import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { determinePartnerReward } from "@/lib/partners/rewards";
import { ProgramEnrollmentSchema } from "@/lib/zod/schemas/programs";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId] – get a partner's enrollment in a program
export const GET = withPartnerProfile(async ({ partner, params }) => {
  const programEnrollment = await getProgramEnrollmentOrThrow({
    partnerId: partner.id,
    programId: params.programId,
  });

  const reward = await determinePartnerReward({
    event: "sale",
    partnerId: programEnrollment.partnerId,
    programId: programEnrollment.programId,
  });

  console.log({reward});

  return NextResponse.json(
    ProgramEnrollmentSchema.parse({
      ...programEnrollment,
      reward,
    }),
  );
});
