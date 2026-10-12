import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { approveProgramApplication } from "@/lib/program-applications/approve-program-application";
import { approveProgramApplicationSchema } from "@/lib/zod/schemas/program-application";
import { NextResponse } from "next/server";

// POST /api/program-applications/approve – Approve a pending partner
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    const { partnerId, applicationId, groupId, tagIds, tagNames } =
      approveProgramApplicationSchema.parse(await parseRequestBody(req));

    const programId = getDefaultProgramIdOrThrow(workspace);

    await approveProgramApplication({
      programId,
      partnerId,
      applicationId,
      groupId,
      tagIds,
      tagNames,
      userId: session.user.id,
    });

    return NextResponse.json({
      partnerId,
    });
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
    requiredRoles: ["owner", "member"],
  },
);
