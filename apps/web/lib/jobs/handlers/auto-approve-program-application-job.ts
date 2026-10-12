import { DubApiError } from "@/lib/api/errors";
import { getProgramApplicationRisks } from "@/lib/api/fraud/get-program-application-risks";
import { evaluateApplicationRequirements } from "@/lib/partners/evaluate-application-requirements";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@/lib/prisma";
import { approveProgramApplication } from "@/lib/program-applications/approve-program-application";
import {
  ProgramApplicationStatus,
  ProgramEnrollmentStatus,
} from "@prisma/client";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  applicationId: z.string(),
});

const AUTO_APPROVABLE_ENROLLMENT_STATUSES: ProgramEnrollmentStatus[] = [
  ProgramEnrollmentStatus.pending,
  ProgramEnrollmentStatus.approved,
];

// This job is used to auto-approve a program application whose group has auto-approval enabled
export const autoApproveProgramApplicationJob = defineJob({
  name: "auto-approve-program-application-job",
  schema: inputSchema,
  async handle(input) {
    const { applicationId } = input;

    const programApplication = await prisma.programApplication.findUnique({
      where: {
        id: applicationId,
      },
      select: {
        programId: true,
        partnerId: true,
        status: true,
        partnerGroup: {
          select: {
            id: true,
            autoApprovePartnersEnabledAt: true,
          },
        },
        partner: {
          select: {
            id: true,
            email: true,
            country: true,
            platforms: true,
          },
        },
        program: {
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
        },
      },
    });

    if (!programApplication) {
      console.warn(`Program application ${applicationId} not found.`);
      return;
    }

    const { programId, partnerId, partner, partnerGroup, program } =
      programApplication;

    if (programApplication.status !== ProgramApplicationStatus.pending) {
      console.warn(
        `Application ${applicationId} is in ${programApplication.status} status.`,
      );
      return;
    }

    if (!partnerId || !partner) {
      console.warn(
        `Application ${applicationId} is not linked to a partner yet.`,
      );
      return;
    }

    if (!partnerGroup) {
      console.warn(`Group not found for application ${applicationId}.`);
      return;
    }

    if (!partnerGroup.autoApprovePartnersEnabledAt) {
      console.warn(
        `Group ${partnerGroup.id} does not have auto-approval enabled.`,
      );
      return;
    }

    const programEnrollment = await prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
      select: {
        status: true,
      },
    });

    if (!programEnrollment) {
      console.warn(`Partner ${partnerId} not found in program ${programId}.`);
      return;
    }

    if (
      !AUTO_APPROVABLE_ENROLLMENT_STATUSES.includes(programEnrollment.status)
    ) {
      console.warn(
        `Application ${applicationId} was not auto-approved because partner ${partnerId} is in ${programEnrollment.status} status.`,
      );
      return;
    }

    // Check if the workspace plan has fraud event management capabilities
    // If enabled, we'll evaluate risk signals before auto-approving
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

    try {
      // The group is resolved from the application itself, falling back to the
      // program's default group
      await approveProgramApplication({
        programId,
        partnerId,
        applicationId,
        userId: owner.userId,
      });
    } catch (error) {
      // Approval preconditions (missing group, partner limit reached) cannot
      // resolve themselves, so there is nothing to retry
      if (error instanceof DubApiError) {
        console.warn(
          `Could not auto-approve application ${applicationId}: ${error.message}`,
        );
        return;
      }

      throw error;
    }

    console.info(
      `Successfully auto-approved partner ${partnerId} in program ${programId}.`,
    );
  },
});
