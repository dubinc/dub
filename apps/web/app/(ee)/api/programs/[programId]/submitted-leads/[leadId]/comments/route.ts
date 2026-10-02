import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubmittedLeadOrThrow } from "@/lib/submitted-leads/get-submitted-lead-or-throw";
import { SubmittedLeadCommentSchema } from "@/lib/zod/schemas/submitted-leads";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/programs/[programId]/submitted-leads/[leadId]/comments
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);

    const lead = await getSubmittedLeadOrThrow({
      leadId: params.leadId,
      programId,
    });

    const comments = await prisma.submittedLeadComment.findMany({
      where: {
        leadId: lead.id,
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      z.array(SubmittedLeadCommentSchema).parse(comments),
    );
  },
  {
    requiredPermissions: ["messages.read"],
    requiredPlan: ["business", "advanced", "enterprise"],
  },
);
