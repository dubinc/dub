import { getGroupMoveRules } from "@/lib/api/groups/get-group-move-rules";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { groupRulesSchema } from "@/lib/zod/schemas/groups";
import { NextResponse } from "next/server";

// GET /api/groups/rules - get group move rules
export const GET = withWorkspace(
  async ({ workspace }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const groups = await getGroupMoveRules(programId);

    return NextResponse.json(groupRulesSchema.parse(groups));
  },
  {
    requiredPermissions: ["groups.read"],
    requiredPlan: ["advanced", "enterprise"],
  },
);
