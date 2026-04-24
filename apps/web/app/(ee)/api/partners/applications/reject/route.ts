import { rejectPartner } from "@/lib/api/partners/applications/reject-partner";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { rejectPartnerSchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";

// POST /api/partners/applications/reject – Reject a pending partner application
export const POST = withWorkspace(
  async ({ workspace, req, session }) => {
    const { partnerId, rejectionReason, rejectionNote, allowImmediateReapply } =
      rejectPartnerSchema.parse(await parseRequestBody(req));

    await rejectPartner({
      workspace,
      partnerId,
      rejectionReason,
      rejectionNote,
      allowImmediateReapply,
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
