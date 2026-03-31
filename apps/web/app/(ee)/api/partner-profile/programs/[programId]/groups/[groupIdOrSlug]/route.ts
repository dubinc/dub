import { getGroupOrThrow } from "@/lib/api/groups/get-group-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { PartnerProgramGroupSchema } from "@/lib/zod/schemas/groups";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/groups/[groupIdOrSlug] - get information about a program's group
export const GET = withPartnerProfile(async ({ params }) => {
  const { programId, groupIdOrSlug } = params;

  const group = await getGroupOrThrow({
    programId,
    groupId: groupIdOrSlug,
  });

  return NextResponse.json(PartnerProgramGroupSchema.parse(group));
});
