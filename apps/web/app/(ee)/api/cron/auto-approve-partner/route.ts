import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getPartnerApplicationRisks } from "@/lib/api/fraud/get-partner-application-risks";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { approvePartnerEnrollment } from "@/lib/partners/approve-partner-enrollment";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../utils";

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
          select: {
            partnerGroup: true,
            groupId: true,
            status: true,
            partner: true,
          },
        },
      },
    });

    const programEnrollment = program.partners[0];

    if (!programEnrollment) {
      return logAndRespond(
        `Partner ${partnerId} not found in program ${programId}. Skipping auto-approval.`,
      );
    }

    const group = programEnrollment.partnerGroup;

    if (!group) {
      return logAndRespond(
        `Group not found for partner ${partnerId} in program ${programId}. Skipping auto-approval.`,
      );
    }

    if (!group.autoApprovePartnersEnabledAt) {
      return logAndRespond(
        `Group ${group.id} does not have auto-approval enabled. Skipping auto-approval.`,
      );
    }

    if (programEnrollment.status !== "pending") {
      return logAndRespond(
        `${partnerId} is in ${programEnrollment.status} status. Skipping auto-approval.`,
      );
    }

    // Check if the workspace plan has fraud event management capabilities
    // If enabled, we'll evaluate risk signals before auto-approving
    const { canManageFraudEvents } = getPlanCapabilities(
      program.workspace.plan,
    );

    if (canManageFraudEvents) {
      const { riskSeverity } = await getPartnerApplicationRisks({
        program,
        partner: programEnrollment.partner,
      });

      if (riskSeverity === "high") {
        return logAndRespond(
          `Partner ${partnerId} has high risk. Skipping auto-approval.`,
        );
      }
    }

    await approvePartnerEnrollment({
      programId,
      partnerId,
      userId: program.workspace.users[0].userId,
      groupId: programEnrollment.groupId,
    });

    return logAndRespond(
      `Successfully auto-approved partner ${partnerId} in program ${programId}.`,
    );
  } catch (error) {
    await log({
      message: `Error auto-approving partner: ${error.message}`,
      type: "alerts",
    });

    return handleAndReturnErrorResponse(error);
  }
}
