import { updatePartnerLink } from "@/lib/api/partners/update-partner-link";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { updatePartnerLinkSchema } from "@/lib/zod/schemas/partners";
import { ProgramPartnerLinkSchemaInternal } from "@/lib/zod/schemas/programs";
import { NextResponse } from "next/server";

// PATCH /api/partners/links/[linkId]
export const PATCH = withWorkspace(
  async ({ workspace, req, params, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { linkId } = params;

    const body = updatePartnerLinkSchema.parse(await parseRequestBody(req));

    const response = await updatePartnerLink({
      workspace,
      programId,
      linkId,
      userId: session.user.id,
      ...body,
    });

    return NextResponse.json(ProgramPartnerLinkSchemaInternal.parse(response));
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
    requiredPermissions: ["links.write"],
  },
);
