import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { embedToken } from "@/lib/embed/embed-token";
import {
  createEmbedTokenSchema,
  EmbedTokenSchema,
} from "@/lib/zod/schemas/token";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// POST /api/tokens/embed - create a new embed token for the given link
export const POST = withWorkspace(
  async ({ workspace, req }) => {
    const { programId, tenantId } = createEmbedTokenSchema.parse(
      await parseRequestBody(req),
    );

    const programEnrollment = await prisma.programEnrollment.findUnique({
      where: {
        tenantId_programId: {
          tenantId,
          programId,
        },
      },
      include: {
        program: true,
      },
    });

    if (
      !programEnrollment ||
      programEnrollment.program.workspaceId !== workspace.id
    ) {
      throw new DubApiError({
        message: `Tenant ${tenantId} not enrolled in this workspace's program ${programId}.`,
        code: "not_found",
      });
    }

    const response = await embedToken.create({
      tenantId,
      programId,
    });

    return NextResponse.json(EmbedTokenSchema.parse(response), {
      status: 201,
    });
  },
  {
    requiredPermissions: ["links.write"],
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "enterprise",
    ],
  },
);
