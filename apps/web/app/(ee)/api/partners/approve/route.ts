import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { approvePartnerEnrollment } from "@/lib/partners/approve-partner-enrollment";
import { approvePartnerSchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";

// POST /api/partners/approve – Approve a pending partner application via API
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    const { partnerId, groupId } = approvePartnerSchema.parse(
      await parseRequestBody(req),
    );

    const programId = getDefaultProgramIdOrThrow(workspace);

    await approvePartnerEnrollment({
      programId,
      partnerId,
      userId: session.user.id,
      groupId,
    });

    return NextResponse.json({
      partnerId,
    });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    requiredRoles: ["owner", "member"],
  },
);
