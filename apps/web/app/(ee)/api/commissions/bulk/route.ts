import { bulkUpdatePartnerCommissions } from "@/lib/api/commissions/update-partner-commission-bulk";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { bulkUpdateCommissionsSchema } from "@/lib/zod/schemas/commissions";
import { NextResponse } from "next/server";

// PATCH /api/commissions/bulk — bulk update commission status
export const PATCH = withWorkspace(
  async ({ workspace, req, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { commissionIds, status } = bulkUpdateCommissionsSchema.parse(
      await parseRequestBody(req),
    );

    const updatedCommissions = await bulkUpdatePartnerCommissions({
      programId,
      status,
      userId: session.user.id,
      commissionIds,
      workspaceId: workspace.id,
      actor: session.user,
    });

    return NextResponse.json(
      updatedCommissions.map((c) => ({
        id: c.id,
        status: c.status,
      })),
    );
  },
  {
    requiredRoles: ["owner", "member"],
  },
);
