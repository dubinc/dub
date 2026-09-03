import { DubApiError } from "@/lib/api/errors";
import { withPartnerProfile } from "@/lib/auth/partner";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PARTNER_GROUP,
  PartnerProgramGroupSchema,
} from "@/lib/zod/schemas/groups";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/groups/[groupIdOrSlug] - get information about a program's group
export const GET = withPartnerProfile(async ({ params, partner }) => {
  const { programId, groupIdOrSlug } = params;

  const group = await prisma.partnerGroup.findFirst({
    where: {
      programId,
      ...(groupIdOrSlug.startsWith("grp_")
        ? { id: groupIdOrSlug }
        : { slug: groupIdOrSlug }),
      OR: [
        { slug: DEFAULT_PARTNER_GROUP.slug },
        { partners: { some: { partnerId: partner.id } } },
      ],
    },
  });

  if (!group) {
    throw new DubApiError({
      code: "not_found",
      message: `Group "${groupIdOrSlug}" not found.`,
    });
  }

  return NextResponse.json(PartnerProgramGroupSchema.parse(group));
});
