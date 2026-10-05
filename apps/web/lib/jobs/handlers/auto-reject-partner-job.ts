import { DubApiError } from "@/lib/api/errors";
import { evaluateApplicationRequirements } from "@/lib/partners/evaluate-application-requirements";
import { prisma } from "@/lib/prisma";
import { rejectProgramApplication } from "@/lib/program-applications/reject-program-application";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  programId: z.string(),
  partnerId: z.string(),
  applicationId: z.string().optional(),
});

// This job is used to auto-reject a partner enrollment (e.g. when eligibility requirements are not met)
export const autoRejectPartnerJob = defineJob({
  name: "auto-reject-partner-job",
  schema: inputSchema,
  async handle(input) {
    const { programId, partnerId, applicationId } = input;

    const programEnrollment = await prisma.programEnrollment.findUnique({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
      select: {
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

    if (!programEnrollment) {
      console.warn(`Partner ${partnerId} not found in program ${programId}.`);
      return;
    }

    const { program, partner } = programEnrollment;

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
        rejectionReason: "doesNotMeetRequirements",
        rejectionNote: undefined,
        reapplicationTimeframe: "standard",
        flagForFraudReason: undefined,
      });
    } catch (error) {
      if (error instanceof DubApiError && error.code === "not_found") {
        console.warn(
          `No pending application found for partner ${partnerId} in program ${programId}.`,
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
