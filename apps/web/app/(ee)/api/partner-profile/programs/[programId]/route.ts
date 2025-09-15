import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { sortRewardsByEventOrder } from "@/lib/partners/sort-rewards-by-event-order";
import { ProgramEnrollmentSchema } from "@/lib/zod/schemas/programs";
import { Reward } from "@prisma/client";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId] – get a partner's enrollment in a program
export const GET = withPartnerProfile(async ({ partner, params }) => {
  const programEnrollment = await getProgramEnrollmentOrThrow({
    partnerId: partner.id,
    programId: params.programId,
    includeClickReward: true,
    includeLeadReward: true,
    includeSaleReward: true,
    includeDiscount: true,
    includeGroup: true,
  });

  const rewards = sortRewardsByEventOrder(
    [
      programEnrollment.clickReward,
      programEnrollment.leadReward,
      programEnrollment.saleReward,
    ].filter((r): r is Reward => r !== null),
  );

  return NextResponse.json(
    ProgramEnrollmentSchema.parse({
      ...programEnrollment,
      rewards,
    }),
  );
});
