import { getPartnerApplicationRisks } from "@/lib/api/fraud/get-partner-application-risks";
import { approvePartner } from "@/lib/api/partners/applications/approve-partner";
import {
  evaluateApplicationRequirements,
  getEligibilityContext,
} from "@/lib/partners/evaluate-application-requirements";
import {
  getScreeningApplicationData,
  rejectScreenedEnrollment,
  screenProgramApplication,
} from "@/lib/partners/screen-program-application";
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
            preferredEarningStructures: true,
            salesChannels: true,
            programs: {
              select: {
                status: true,
              },
            },
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
        name: true,
        slug: true,
        description: true,
        supportEmail: true,
        applicationRequirements: true,
        applicationScreeningPrompt: true,
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
      context: getEligibilityContext({
        partner: programEnrollment.partner,
        programEnrollmentStatuses: programEnrollment.partner.programs.map(
          ({ status }) => status,
        ),
      }),
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

    // Auto-approval never bypasses application screening. If screening is
    // configured and this application has no verdict yet (e.g. screening
    // failed open at submit time, or was enabled after the partner applied),
    // screen it now and only continue on a pass.
    if (program.applicationScreeningPrompt) {
      const application = programEnrollment.application;

      if (!application) {
        console.warn(
          `Partner ${partnerId} has no application to screen for program ${programId}, skipping auto-approval.`,
        );
        return;
      }

      if (!application.screenedAt) {
        const screening = await screenProgramApplication({
          program,
          partner: programEnrollment.partner,
          application,
        });

        if (!screening) {
          console.warn(
            `Application screening unavailable for partner ${partnerId} in program ${programId}, leaving pending for manual review.`,
          );
          return;
        }

        if (screening.decision === "reject") {
          await rejectScreenedEnrollment({
            programEnrollment,
            program,
            partner: programEnrollment.partner,
          });

          console.info(
            `Partner ${partnerId} was rejected by application screening in program ${programId}.`,
          );
          return;
        }

        await prisma.programApplication.update({
          where: { id: application.id },
          data: getScreeningApplicationData(screening),
        });
      }
    }

    const owner = program.workspace.users[0];

    if (!owner) {
      console.warn(`Owner not found for program ${programId}.`);
      return;
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
