import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import z from "@/lib/zod";
import { nanoid } from "@dub/utils";
import { NextResponse } from "next/server";

const createTokenSchema = z.object({
  affiliateId: z.string(),
});

const tokenSchema = z.object({
  token: z.string(),
});

// POST /api/affiliates/flows – create an onboarding flow
export const POST = withWorkspace(
  async ({ req, workspace }) => {
    const { affiliateId } = createTokenSchema.parse(
      await parseRequestBody(req),
    );

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

    const token = await prisma.affiliateToken.create({
      data: {
        affiliateId,
        token: nanoid(40),
        expiresAt: new Date(Date.now() + 1000 * 60 * 30), // 30 minutes
      },
    });

    return NextResponse.json(tokenSchema.parse({ token }), {
      status: 201,
    });
  },
  {
    // requiredAddOn: "conversion",
    // requiredPermissions: ["conversions.write"],
  },
);
