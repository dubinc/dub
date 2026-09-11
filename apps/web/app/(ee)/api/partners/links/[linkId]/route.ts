import { updatePartnerLink } from "@/lib/api/partners/update-partner-link";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { updatePartnerLinkSchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";

// PATCH /api/partners/links/[linkId]
export const PATCH = withWorkspace(
  async ({ workspace, req, params }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { linkId } = params;

    const body = updatePartnerLinkSchema.parse(await parseRequestBody(req));

    const response = await updatePartnerLink({
      workspaceId: workspace.id,
      programId,
      linkId,
      ...body,
    });

    return NextResponse.json(response);
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
    requiredRoles: ["owner", "member"],
  },
);
