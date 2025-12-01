import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import {
  fraudEventQuerySchema,
  fraudEventSchemas,
} from "@/lib/zod/schemas/fraud";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/fraud/events - Get the fraud events for a group
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { groupId } = fraudEventQuerySchema.parse(searchParams);

    const fraudEventGroup = await prisma.fraudEventGroup.findUnique({
      where: {
        id: groupId,
      },
    });

    if (!fraudEventGroup) {
      throw new DubApiError({
        code: "not_found",
        message: "Fraud event group not found.",
      });
    }

    if (fraudEventGroup.programId !== programId) {
      throw new DubApiError({
        code: "not_found",
        message: "Fraud event group not found in this program.",
      });
    }

    const fraudEvents = await prisma.fraudEvent.findMany({
      where: {
        fraudEventGroupId: groupId,
      },
      include: {
        customer: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const zodSchema = fraudEventSchemas[fraudEventGroup.type];

    return NextResponse.json(z.array(zodSchema).parse(fraudEvents));
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
