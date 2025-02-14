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

// POST /api/tokens/embed - create a new embed token for the given partner/tenant
export const POST = withWorkspace(
  async ({ workspace, req }) => {
    const { programId, partnerId, tenantId } = createEmbedTokenSchema.parse(
      await parseRequestBody(req),
    );

    if (!partnerId && !tenantId) {
      throw new DubApiError({
        message: "Partner ID or tenant ID is required",
        code: "bad_request",
      });
    }

    const programEnrollment = await prisma.programEnrollment.findUnique({
      where: tenantId
        ? { tenantId_programId: { tenantId, programId } }
        : { partnerId_programId: { partnerId: partnerId!, programId } },
      include: {
        program: true,
      },
    });

    if (
      !programEnrollment ||
      programEnrollment.program.workspaceId !== workspace.id
    ) {
      throw new DubApiError({
        message: `Partner with ${
          partnerId ? `ID ${partnerId}` : `tenant ID ${tenantId}`
        } not enrolled in this workspace's program ${programId}.`,
        code: "not_found",
      });
    }

    const response = await embedToken.create({
      programId,
      partnerId: programEnrollment.partnerId,
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
