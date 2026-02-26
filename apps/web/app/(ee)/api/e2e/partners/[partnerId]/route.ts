import { getPartnerForProgram } from "@/lib/api/partner-profile/get-partner-for-program";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { DubApiError } from "@/lib/api/errors";
import { NextResponse } from "next/server";
import { assertE2EWorkspace } from "../../guard";

// GET /api/e2e/partners/:partnerId - Get partner with enrollment (including groupId) for E2E tests.
// Bypasses plan restrictions; only works for Acme workspace.
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    assertE2EWorkspace(workspace);

    const { partnerId } = await params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const partner = await getPartnerForProgram({
      partnerId,
      programId,
    });

    if (!partner) {
      throw new DubApiError({
        code: "not_found",
        message: "Partner not found.",
      });
    }

    return NextResponse.json(partner);
  },
  {
    requiredPermissions: ["workspaces.write"],
  },
);
