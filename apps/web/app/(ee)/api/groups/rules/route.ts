import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { groupRulesSchema } from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/groups/rules - get group move rules
export const GET = withWorkspace(
  async ({ workspace }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const groups = await prisma.partnerGroup.findMany({
      where: {
        programId,
      },
      select: {
        id: true,
        name: true,
        workflow: {
          select: {
            triggerConditions: true,
          },
        },
      },
    });

    const results = groups.map((group) => ({
      id: group.id,
      name: group.name,
      moveRules: group.workflow?.triggerConditions,
    }));

    return NextResponse.json(groupRulesSchema.parse(results));
  },
  {
    requiredPermissions: ["groups.read"],
    requiredPlan: ["advanced", "enterprise"],
  },
);
