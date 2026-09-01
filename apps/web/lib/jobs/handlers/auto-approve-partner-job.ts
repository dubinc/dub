import { getPartnerApplicationRisks } from "@/lib/api/fraud/get-partner-application-risks";
import { approvePartner } from "@/lib/api/partners/applications/approve-partner";
import { evaluateApplicationRequirements } from "@/lib/partners/evaluate-application-requirements";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { ProgramEnrollmentStatus } from "@prisma/client";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  programId: z.string(),
  partnerId: z.string(),
});

// This job is used to auto-approve a partner enrolled in a program
export const autoApprovePartnerJob = defineJob({
  name: "auto-approve-partner-job",
  schema: inputSchema,
  async handle(input) {
    const { programId, partnerId } = input;

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
      console.warn(`Partner ${partnerId} not found in program ${programId}.`);
      return;
    }

    const group = programEnrollment.partnerGroup;

    if (!group) {
      console.warn(
        `Group not found for partner ${partnerId} in program ${programId}.`,
      );
      return;
    }

    if (!group.autoApprovePartnersEnabledAt) {
      console.warn(`Group ${group.id} does not have auto-approval enabled.`);
      return;
    }

    if (programEnrollment.status !== ProgramEnrollmentStatus.pending) {
      console.warn(`${partnerId} is in ${programEnrollment.status} status.`);
      return;
    }

    // Check if the workspace plan has fraud event management capabilities
    // If enabled, we'll evaluate risk signals before auto-approving
    const program = await prisma.program.findUniqueOrThrow({
      where: {
        id: programId,
      },
      select: {
        id: true,
        applicationRequirements: true,
        workspace: {
          select: {
            plan: true,
            users: {
              where: {
                role: "owner",
              },
              take: 1,
              select: {
                userId: true,
              },
            },
          },
        },
      },
    });

    const { canManageFraudEvents } = getPlanCapabilities(
      program.workspace.plan,
    );

    if (canManageFraudEvents) {
      const { riskSeverity } = await getPartnerApplicationRisks({
        program,
        partner: programEnrollment.partner,
      });

      if (riskSeverity === "high") {
        console.warn(`Partner ${partnerId} has high risk.`);
        return;
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
          console.warn(
            `Invalid applicationRequirements for program ${programId}.`,
          );
          return;

        case "requirementsNotMet":
          console.warn(
            `Partner ${partnerId} does not meet eligibility requirements.`,
          );
          return;
      }
    }

    await approvePartner({
      programId,
      partnerId,
      userId: program.workspace.users[0].userId,
      groupId: programEnrollment.groupId,
    });

    console.info(
      `Successfully auto-approved partner ${partnerId} in program ${programId}.`,
    );
  },
});
