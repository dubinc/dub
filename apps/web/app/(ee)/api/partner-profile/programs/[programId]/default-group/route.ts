import { DubApiError } from "@/lib/api/errors";
import { withPartnerProfile } from "@/lib/auth/partner";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PARTNER_GROUP,
  PartnerProgramGroupSchema,
} from "@/lib/zod/schemas/groups";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/default-group - get information about a program's default group
export const GET = withPartnerProfile(async ({ params, partner }) => {
  const { programId } = params;

  const group = await prisma.partnerGroup.findUnique({
    where: {
      programId_slug: {
        programId,
        slug: DEFAULT_PARTNER_GROUP.slug,
      },
    },
  });

  // should never happen, but just in case
  if (!group) {
    throw new DubApiError({
      code: "not_found",
      message: `Program "${programId}" does not have a default group.`,
    });
  }

  return NextResponse.json(PartnerProgramGroupSchema.parse(group));
});
