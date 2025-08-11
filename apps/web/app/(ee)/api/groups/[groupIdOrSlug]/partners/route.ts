import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getGroupOrThrow } from "@/lib/api/programs/get-group-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { changeGroupSchema } from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// POST /api/groups/[groupIdOrSlug]/partners - change group of partners
export const POST = withWorkspace(
  async ({ req, params, workspace }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const group = await getGroupOrThrow({
      programId,
      groupId: params.groupIdOrSlug,
    });

    const { partnerIds } = changeGroupSchema.parse(await parseRequestBody(req));

    const { count } = await prisma.programEnrollment.updateMany({
      where: {
        partnerId: {
          in: partnerIds,
        },
        programId,
      },
      data: {
        partnerGroupId: group.id,
      },
    });

    return NextResponse.json({
      count,
    });
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
