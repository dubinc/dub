import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { rejectProgramApplication } from "@/lib/program-applications/reject-program-application";
import { rejectProgramApplicationSchema } from "@/lib/zod/schemas/program-application";
import { NextResponse } from "next/server";

// POST /api/program-applications/reject – Reject a pending partner application
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    const {
      partnerId,
      rejectionReason,
      rejectionNote,
      reapplicationTimeframe,
      flagForFraud,
      flagForFraudReason,
    } = rejectProgramApplicationSchema.parse(await parseRequestBody(req));

    const programId = getDefaultProgramIdOrThrow(workspace);

    await rejectProgramApplication({
      programId,
      partnerId,
      rejectionReason,
      rejectionNote,
      reapplicationTimeframe,
      flagForFraud,
      flagForFraudReason,
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
