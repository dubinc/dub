import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { PartnerLinkSchema } from "@/lib/zod/schemas/programs";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/links - get a partner's links in a program
export const GET = withPartnerProfile(async ({ partner, params }) => {
  const { links } = await getProgramEnrollmentOrThrow({
    partnerId: partner.id,
    programId: params.programId,
  });

  return NextResponse.json(links.map((link) => PartnerLinkSchema.parse(link)));
});
