import { upsertPartnerLink } from "@/lib/api/partners/upsert-partner-link";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { upsertPartnerLinkSchema } from "@/lib/zod/schemas/partners";
import { NextResponse } from "next/server";

// PUT /api/partners/links/upsert – update or create a partner link
export const PUT = withWorkspace(
  async ({ req, headers, workspace, session }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const body = upsertPartnerLinkSchema.parse(await parseRequestBody(req));

    return NextResponse.json(
      await upsertPartnerLink({
        workspace,
        programId,
        userId: session.user.id,
        ...body,
      }),
      { headers },
    );
  },
  {
    requiredPermissions: ["links.write"],
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);
