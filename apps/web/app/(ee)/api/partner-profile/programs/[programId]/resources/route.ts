import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { programResourcesSchema } from "@/lib/zod/schemas/program-resources";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/resources – get resources for an enrolled program
export const GET = withPartnerProfile(async ({ partner, params }) => {
  const { program } = await getProgramEnrollmentOrThrow({
    partnerId: partner.id,
    programId: params.programId,
  });

  const resources = programResourcesSchema.parse(
    program?.resources ?? {
      logos: [],
      colors: [],
      files: [],
    },
  );

  return NextResponse.json(resources);
});
