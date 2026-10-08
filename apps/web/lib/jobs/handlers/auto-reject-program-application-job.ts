import { DubApiError } from "@/lib/api/errors";
import { evaluateApplicationRequirements } from "@/lib/partners/evaluate-application-requirements";
import { prisma } from "@/lib/prisma";
import { rejectProgramApplication } from "@/lib/program-applications/reject-program-application";
import {
  ProgramApplicationRejectionReason,
  ProgramApplicationStatus,
} from "@prisma/client";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  applicationId: z.string(),
});

// This job is used to auto-reject a program application (e.g. when eligibility requirements are not met)
export const autoRejectProgramApplicationJob = defineJob({
  name: "auto-reject-program-application-job",
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
        partner: {
          select: {
            email: true,
            country: true,
          },
        },
        program: {
          select: {
            applicationRequirements: true,
          },
        },
      },
    });

    if (!programApplication) {
      console.warn(`Program application ${applicationId} not found.`);
      return;
    }

    const { programId, partnerId, partner, program } = programApplication;

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

    const result = evaluateApplicationRequirements({
      applicationRequirements: program.applicationRequirements,
      context: {
        country: partner.country,
        email: partner.email,
      },
    });

    if (result.reason !== "requirementsNotMet") {
      console.warn(
        `Partner ${partnerId} now meets requirements for program ${programId} (reason: ${result.reason}).`,
      );
      return;
    }

    try {
      await rejectProgramApplication({
        programId,
        partnerId,
        applicationId,
        rejectionReason:
          ProgramApplicationRejectionReason.doesNotMeetRequirements,
        rejectionNote: undefined,
        reapplicationTimeframe: "standard",
        flagForFraudReason: undefined,
      });
    } catch (error) {
      // Rejection preconditions (missing application, non-rejectable
      // enrollment) cannot resolve themselves, so there is nothing to retry
      if (error instanceof DubApiError) {
        console.warn(
          `Could not auto-reject application ${applicationId}: ${error.message}`,
        );
        return;
      }

      throw error;
    }

    console.info(
      `Successfully auto-rejected partner ${partnerId} in program ${programId}.`,
    );
  },
});
