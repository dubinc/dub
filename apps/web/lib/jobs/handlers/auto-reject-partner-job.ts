import { rejectPendingEnrollment } from "@/lib/api/partners/applications/reject-pending-enrollment";
import { evaluateApplicationRequirements } from "@/lib/partners/evaluate-application-requirements";
import { prisma } from "@/lib/prisma";
import {
  ProgramApplicationRejectionReason,
  ProgramEnrollmentStatus,
} from "@prisma/client";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  programId: z.string(),
  partnerId: z.string(),
});

// This job is used to auto-reject a partner enrollment (e.g. when eligibility requirements are not met)
export const autoRejectPartnerJob = defineJob({
  name: "auto-reject-partner-job",
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
        partner: {
          select: {
            country: true,
            email: true,
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

    if (programEnrollment.status !== ProgramEnrollmentStatus.pending) {
      console.warn(`${partnerId} is in ${programEnrollment.status} status.`);
      return;
    }

    const result = evaluateApplicationRequirements({
      applicationRequirements:
        programEnrollment.program.applicationRequirements,
      context: {
        country: programEnrollment.partner.country,
        email: programEnrollment.partner.email,
      },
    });

    if (result.reason !== "requirementsNotMet") {
      console.warn(
        `Partner ${partnerId} now meets requirements for program ${programId} (reason: ${result.reason}).`,
      );
      return;
    }

    const rejected = await rejectPendingEnrollment({
      programId,
      partnerId,
      rejectionReason:
        ProgramApplicationRejectionReason.doesNotMeetRequirements,
    });

    if (!rejected) {
      console.warn(
        `Partner ${partnerId} is no longer pending in program ${programId}.`,
      );
      return;
    }

    console.info(
      `Successfully auto-rejected partner ${partnerId} in program ${programId}.`,
    );
  },
});
