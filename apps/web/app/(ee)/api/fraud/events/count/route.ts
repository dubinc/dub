import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { fraudEventCountQuerySchema } from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/fraud/events/count - Get the count of fraud events
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { groupId } = fraudEventCountQuerySchema.parse(searchParams);

    const fraudGroup = await prisma.fraudEventGroup.findUnique({
      where: {
        id: groupId,
      },
      select: {
        programId: true,
        partnerId: true,
        type: true,
      },
    });

    if (!fraudGroup) {
      throw new DubApiError({
        code: "not_found",
        message: "Fraud event group not found.",
      });
    }

    if (fraudGroup.programId !== programId) {
      throw new DubApiError({
        code: "not_found",
        message: "Fraud event group not found in this program.",
      });
    }

    const count = await prisma.fraudEvent.count({
      where: {
        fraudEventGroupId: groupId,
      },
    });

    return NextResponse.json(count);
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
