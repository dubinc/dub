import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { assertE2EWorkspace } from "../guard";

// PATCH /api/e2e/enrollments - Update enrollment (e.g., backdate createdAt)
export const PATCH = withWorkspace(
  async ({ req, workspace }) => {
    assertE2EWorkspace(workspace);

    const programId = getDefaultProgramIdOrThrow(workspace);
    const body = await req.json();
    const { partnerId, createdAt } = body;

    const enrollment = await prisma.programEnrollment.update({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
      data: {
        ...(createdAt && { createdAt: new Date(createdAt) }),
      },
      select: {
        partnerId: true,
        programId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(enrollment);
  },
  {
    requiredPermissions: ["workspaces.write"],
  },
);
