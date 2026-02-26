import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { assertE2EWorkspace } from "../../guard";

// PATCH /api/e2e/workflows/[workflowId] - Update workflow (e.g., disable)
export const PATCH = withWorkspace(
  async ({ req, params, workspace }) => {
    assertE2EWorkspace(workspace);

    const { workflowId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);
    const body = await req.json();

    const workflow = await prisma.workflow.update({
      where: { id: workflowId, programId },
      data: {
        disabledAt: body.disabledAt ? new Date(body.disabledAt) : null,
      },
      select: {
        id: true,
        disabledAt: true,
      },
    });

    return NextResponse.json(workflow);
  },
  {
    requiredPermissions: ["workspaces.write"],
  },
);
