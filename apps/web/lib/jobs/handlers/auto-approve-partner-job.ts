import { evaluatePartnerApplication } from "@/lib/ai/evaluate-partner-application";
import { getPartnerApplicationRisks } from "@/lib/api/fraud/get-partner-application-risks";
import { approvePartner } from "@/lib/api/partners/applications/approve-partner";
import { screenPartnerApplication } from "@/lib/api/partners/applications/screen-partner-application";
import { logger } from "@/lib/axiom/server";
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
        application: true,
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

    const program = await prisma.program.findUniqueOrThrow({
      where: {
        id: programId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        applicationRequirements: true,
        applicationScreeningCriteria: true,
        aiAutoApproveEnabledAt: true,
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

    const owner = program.workspace.users[0];

    if (!owner) {
      console.warn(`Owner not found for program ${programId}.`);
      return;
    }

    const screeningCriteria = program.applicationScreeningCriteria?.trim();

    if (screeningCriteria) {
      const matchedScreeningCriteria = await screenPartnerApplication({
        programId,
        partnerId,
        program: {
          name: program.name,
          description: program.description,
        },
        partner: programEnrollment.partner,
        application: programEnrollment.application,
        landerData: group.landerData,
        screeningCriteria,
      });

      if (matchedScreeningCriteria) {
        return;
      }
    }

    if (program.aiAutoApproveEnabledAt) {
      const evaluation = await evaluatePartnerApplication({
        program: {
          name: program.name,
          description: program.description,
        },
        partner: programEnrollment.partner,
        application: programEnrollment.application,
        landerData: group.landerData,
      });

      logger.info("jev.partner.auto-approve", {
        programId,
        partnerId,
        status: evaluation.status,
        probability: evaluation.probability,
        error: evaluation.error,
        usage: evaluation.usage,
      });
      await logger.flush();

      if (evaluation.status === "matched") {
        console.warn(
          `Partner ${partnerId} held from auto-approve (Jev poorFit=${evaluation.probability}).`,
        );
        return;
      }
    }

    await approvePartner({
      programId,
      partnerId,
      userId: owner.userId,
      groupId: programEnrollment.groupId,
    });

    console.info(
      `Successfully auto-approved partner ${partnerId} in program ${programId}.`,
    );
  },
});
