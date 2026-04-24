import { getPartnerApplicationRisks } from "@/lib/api/fraud/get-partner-application-risks";
import { approvePartner } from "@/lib/api/partners/applications/approve-partner";
import { withCron } from "@/lib/cron/with-cron";
import { evaluateApplicationRequirements } from "@/lib/partners/evaluate-application-requirements";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@dub/prisma";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  programId: z.string(),
  partnerId: z.string(),
});

// POST /api/cron/partners/auto-approve
// This route is used to auto-approve a partner enrolled in a program
export const POST = withCron(async ({ rawBody }) => {
  const { programId, partnerId } = schema.parse(JSON.parse(rawBody));

  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    include: {
      partnerGroup: true,
      partner: {
        include: {
          platforms: true,
        },
      },
    },
  });

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
    },
  });

  const { canManageFraudEvents } = getPlanCapabilities(program.workspace.plan);

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

  const result = evaluateApplicationRequirements({
    applicationRequirements: program.applicationRequirements,
    context: {
      country: programEnrollment.partner.country,
      email: programEnrollment.partner.email,
    },
  });

  if (!result.valid) {
    switch (result.reason) {
      case "invalidRequirements":
        return logAndRespond(
          `Invalid applicationRequirements for program ${programId}. Skipping auto-approval.`,
        );

      case "requirementsNotMet":
        return logAndRespond(
          `Partner ${partnerId} does not meet eligibility requirements. Skipping auto-approval.`,
        );
    }
  }

  await approvePartner({
    programId,
    partnerId,
    userId: program.workspace.users[0].userId,
    groupId: programEnrollment.groupId,
  });

  return logAndRespond(
    `Successfully auto-approved partner ${partnerId} in program ${programId}.`,
  );
});
