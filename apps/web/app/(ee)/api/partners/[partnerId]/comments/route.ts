import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PartnerCommentSchema } from "@/lib/zod/schemas/programs";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/partners/:id/comments – Get partner comments
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { partnerId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const comments = await prisma.partnerComment.findMany({
      where: {
        programId,
        partnerId,
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(z.array(PartnerCommentSchema).parse(comments));
  },
  {
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);
