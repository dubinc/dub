import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { approvePartnerEnrollment } from "@/lib/partners/approve-partner-enrollment";
import { WorkspaceProps } from "@/lib/types";
import { programLanderSchema } from "@/lib/zod/schemas/program-lander";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  programId: z.string(),
  partnerId: z.string(),
});

// POST /api/cron/auto-approve-partner
// This route is used to auto-approve a partner enrolled in a program
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { programId, partnerId } = schema.parse(JSON.parse(rawBody));

    const program = await prisma.program.findUniqueOrThrow({
      where: {
        id: programId,
      },
      include: {
        workspace: {
          select: {
            id: true,
            plan: true,
            webhookEnabled: true,
          },
        },
      },
    });

    if (!program.autoApprovePartnersEnabledAt) {
      return new Response(
        `Program ${programId} does not have auto-approval enabled. Skipping auto-approval.`,
      );
    }

    const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
    });

    if (programEnrollment.status !== "pending") {
      return new Response(
        `${partnerId} is ${programEnrollment.status}. Skipping auto-approval.`,
      );
    }

    const workspaceOwner = await prisma.projectUsers.findFirstOrThrow({
      where: {
        projectId: program.workspaceId,
        role: "owner",
      },
      select: {
        userId: true,
      },
    });

    await approvePartnerEnrollment({
      workspace: program.workspace as WorkspaceProps,
      program: {
        ...program,
        landerData: programLanderSchema.nullish().parse(program.landerData),
      },
      partnerId,
      linkId: null,
      userId: workspaceOwner.userId,
    });

    return new Response("Partner is auto-approved.");
  } catch (error) {
    await log({
      message: `Error auto-approving partner: ${error.message}`,
      type: "alerts",
    });

    return handleAndReturnErrorResponse(error);
  }
}
