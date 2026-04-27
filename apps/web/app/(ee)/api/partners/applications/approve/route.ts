import { approvePartner } from "@/lib/api/partners/applications/approve-partner";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { approvePartnerSchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";

// POST /api/partners/applications/approve – Approve a pending partner
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    const { partnerId, groupId } = approvePartnerSchema.parse(
      await parseRequestBody(req),
    );

    const programId = getDefaultProgramIdOrThrow(workspace);

    await approvePartner({
      programId,
      partnerId,
      groupId,
      userId: session.user.id,
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
