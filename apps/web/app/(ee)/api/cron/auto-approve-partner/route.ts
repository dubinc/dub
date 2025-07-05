import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { approvePartnerEnrollment } from "@/lib/partners/approve-partner-enrollment";
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
          include: {
            users: {
              where: {
                role: "owner",
              },
              take: 1,
            },
          },
        },
        partners: {
          where: {
            partnerId,
          },
        },
      },
    });

    if (!program.autoApprovePartnersEnabledAt) {
      return new Response(
        `Program ${programId} does not have auto-approval enabled. Skipping auto-approval.`,
      );
    }

    if (program.partners.length === 0) {
      return new Response(
        `Partner ${partnerId} not found in program ${programId}. Skipping auto-approval.`,
      );
    }

    if (program.partners[0].status !== "pending") {
      return new Response(
        `${partnerId} is ${program.partners[0].status}. Skipping auto-approval.`,
      );
    }

    await approvePartnerEnrollment({
      programId,
      partnerId,
      linkId: null,
      userId: program.workspace.users[0].userId,
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
