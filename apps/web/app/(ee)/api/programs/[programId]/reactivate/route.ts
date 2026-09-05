import { DubApiError } from "@/lib/api/errors";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { reactivateProgram } from "@/lib/api/programs/reactivate-program";
import { withWorkspace } from "@/lib/auth";
import { NextResponse } from "next/server";

// POST /api/programs/[programId]/reactivate – reactivate a deactivated program
export const POST = withWorkspace(
  async ({ workspace, params }) => {
    const program = await getProgramOrThrow({
      workspaceId: workspace.id,
      programId: params.programId,
    });

    if (!program.deactivatedAt) {
      throw new DubApiError({
        code: "bad_request",
        message: "This program is not deactivated.",
      });
    }

    await reactivateProgram(workspace);

    return NextResponse.json({ id: program.id });
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
    requiredRoles: ["owner", "member"],
  },
);
