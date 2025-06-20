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
  userId: z.string(),
  partnerIds: z.array(z.string()),
});

// POST /api/cron/bulk-approve-partners
// This route is used to bulk approve a list of partners enrolled in a program
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { programId, userId, partnerIds } = schema.parse(JSON.parse(rawBody));

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

    for (const partnerId of partnerIds) {
      await approvePartnerEnrollment({
        workspace: program.workspace as WorkspaceProps,
        program,
        partnerId,
        linkId: null,
        userId,
      });
    }

    return new Response(`${partnerIds.length} partners approved.`);
  } catch (error) {
    await log({
      message: `Error auto-approving partner: ${error.message}`,
      type: "alerts",
    });

    return handleAndReturnErrorResponse(error);
  }
}
