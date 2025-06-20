import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { approvePartnerEnrollment } from "@/lib/partners/approve-partner-enrollment";
import { WorkspaceProps } from "@/lib/types";
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
        workspace: true,
      },
    });

    if (!program.autoApprovePartners) {
      return new Response("Program does not have auto-approval enabled.");
    }

    await approvePartnerEnrollment({
      workspace: program.workspace as WorkspaceProps,
      program,
      partnerId,
      linkId: null,
      userId: "xxx", // FIXME: Add a user id
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
