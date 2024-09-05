import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { createFlowToken } from "@/lib/dots/tokens";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { NextResponse } from "next/server";

const createFlowSchema = z.object({
  affiliateId: z.string().describe("The affiliate ID to create a flow for."),
});

const tokenSchema = z.object({
  token: z.string(),
});

// POST /api/affiliates/flows – create an onboarding flow
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    const { affiliateId } = createFlowSchema.parse(await parseRequestBody(req));

    const affiliate = await prisma.affiliate.findUnique({
      where: {
        id: affiliateId,
        projectId: workspace.id,
      },
    });

    if (!affiliate) {
      throw new DubApiError({
        code: "not_found",
        message: `Affiliate with ID ${affiliateId} not found.`,
      });
    }

    const token = await createFlowToken({
      affiliateId,
      workspaceId: workspace.id,
    });

    return NextResponse.json(tokenSchema.parse({ token }), { status: 201 });
  },
  {
    // requiredAddOn: "conversion",
    // requiredPermissions: ["conversions.write"],
  },
);
