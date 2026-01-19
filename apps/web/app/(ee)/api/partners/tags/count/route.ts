import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getPartnerTagsCountQuerySchema } from "@/lib/zod/schemas/partner-tags";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partners/tags/count - get count of partner tags
export const GET = withWorkspace(
  async ({ workspace, headers, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { search } = getPartnerTagsCountQuerySchema.parse(searchParams);

    const count = await prisma.partnerTag.count({
      where: {
        programId,
        ...(search && {
          name: {
            contains: search,
          },
        }),
      },
    });

    return NextResponse.json(count, { headers });
  },
  {
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);
