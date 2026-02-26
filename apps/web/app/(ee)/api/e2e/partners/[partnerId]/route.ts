import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { assertE2EWorkspace } from "../../guard";

// GET /api/e2e/partners/:partnerId - Get partner with groupId for E2E tests.
// Bypasses plan restrictions; only works for Acme workspace.
// Returns minimal payload (id, groupId) to avoid BigInt serialization issues.
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    assertE2EWorkspace(workspace);

    const { partnerId } = await params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const enrollment = await prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: { partnerId, programId },
      },
      select: { partnerId: true, groupId: true },
    });

    if (!enrollment) {
      throw new DubApiError({
        code: "not_found",
        message: "Partner not found.",
      });
    }

    return NextResponse.json({
      id: enrollment.partnerId,
      groupId: enrollment.groupId,
    });
  },
  {
    requiredPermissions: ["workspaces.write"],
  },
);
