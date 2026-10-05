import { getProgramApplicationRisks } from "@/lib/api/fraud/get-program-application-risks";
import { evaluateApplicationRequirements } from "@/lib/partners/evaluate-application-requirements";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { approveProgramApplication } from "@/lib/program-applications/approve-program-application";
import { ProgramApplicationStatus } from "@prisma/client";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  programId: z.string(),
  partnerId: z.string(),
  applicationId: z.string().optional(),
});

// TODO:
// Rename this job to auto-approve-program-application-job

// This job is used to auto-approve a partner enrolled in a program
export const autoApprovePartnerJob = defineJob({
  name: "auto-approve-partner-job",
  schema: inputSchema,
  async handle(input) {
    const { programId, partnerId, applicationId } = input;

    const [programApplication, programEnrollment] = await Promise.all([
      prisma.programApplication.findFirst({
        where: {
          ...(applicationId && { id: applicationId }),
          programId,
          partnerId,
          status: ProgramApplicationStatus.pending,
        },
        include: {
          partnerGroup: true,
          partner: {
            include: {
              platforms: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.programEnrollment.findUnique({
        where: {
          partnerId_programId: {
            partnerId,
            programId,
          },
        },
        select: {
          status: true,
          groupId: true,
        },
      }),
    ]);

    if (!programApplication) {
      console.warn(
        `No pending application found for partner ${partnerId} in program ${programId}.`,
      );
      return;
    }

    if (programApplication.status !== ProgramApplicationStatus.pending) {
      console.warn(`Application ${programApplication.id} is not pending.`);
      return;
    }

    if (!programEnrollment) {
      console.warn(`Partner ${partnerId} not found in program ${programId}.`);
      return;
    }

    const isApplyingToAdditionalGroup =
      programApplication.groupId !== programEnrollment.groupId;

    if (isApplyingToAdditionalGroup) {
      console.warn(
        `Partner ${partnerId} is applying to a different group than the one they are already in.`,
      );
      return;
    }

    const { partnerGroup, partner } = programApplication;

    if (!partnerGroup) {
      console.warn(
        `Partner group not found for partner ${partnerId} in program ${programId}.`,
      );
      return;
    }

    if (!partnerGroup.autoApprovePartnersEnabledAt) {
      console.warn(
        `Partner group ${partnerGroup.id} does not have auto-approval enabled.`,
      );
      return;
    }

    if (!partner) {
      console.warn(
        `Partner not found for application ${programApplication.id}.`,
      );
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
      const { riskSeverity } = await getProgramApplicationRisks({
        program,
        partner,
      });

      if (riskSeverity === "high") {
        console.warn(`Partner ${partnerId} has high risk.`);
        return;
      }
    }

    const result = evaluateApplicationRequirements({
      applicationRequirements: program.applicationRequirements,
      context: {
        country: partner.country,
        email: partner.email,
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

    const owner = program.workspace.users[0];

    if (!owner) {
      console.warn(`Owner not found for program ${programId}.`);
      return;
    }

    await approveProgramApplication({
      programId,
      partnerId,
      userId: owner.userId,
      groupId: programEnrollment.groupId,
      applicationId: programApplication.id,
    });

    console.info(
      `Successfully auto-approved partner ${partnerId} in program ${programId}.`,
    );
  },
});
