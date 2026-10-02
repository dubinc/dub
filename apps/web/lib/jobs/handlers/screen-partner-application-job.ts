import { screenPartnerApplication } from "@/lib/api/partners/applications/screen-partner-application";
import { prisma } from "@/lib/prisma";
import { ProgramEnrollmentStatus } from "@prisma/client";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  programId: z.string(),
  partnerId: z.string(),
});

// This job screens a pending application against the program's written criteria.
// Groups with auto-approval enabled are screened inside auto-approve-partner-job instead.
export const screenPartnerApplicationJob = defineJob({
  name: "screen-partner-application-job",
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
        program: {
          select: {
            name: true,
            description: true,
            applicationScreeningCriteria: true,
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

    const { program } = programEnrollment;
    const screeningCriteria = program.applicationScreeningCriteria?.trim();

    if (!screeningCriteria) {
      console.warn(
        `Program ${programId} does not have application screening criteria.`,
      );
      return;
    }

    await screenPartnerApplication({
      programId,
      partnerId,
      program: {
        name: program.name,
        description: program.description,
      },
      partner: programEnrollment.partner,
      application: programEnrollment.application,
      landerData: programEnrollment.partnerGroup?.landerData,
      screeningCriteria,
    });
  },
});
