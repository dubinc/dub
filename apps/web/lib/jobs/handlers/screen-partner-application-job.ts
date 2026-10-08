import { screenPartnerApplication } from "@/lib/program-applications/screen-partner-application";
import { prisma } from "@/lib/prisma";
import { ProgramApplicationStatus } from "@prisma/client";
import * as z from "zod/v4";
import { defineJob } from "../index";

const inputSchema = z.object({
  programId: z.string(),
  partnerId: z.string(),
});

// This job screens a pending application against the program's written criteria.
// Groups with auto-approval enabled are screened inside auto-approve-program-application-job instead.
export const screenPartnerApplicationJob = defineJob({
  name: "screen-partner-application-job",
  schema: inputSchema,
  async handle(input) {
    const { programId, partnerId } = input;

    const programApplication = await prisma.programApplication.findFirst({
      where: {
        programId,
        partnerId,
        status: ProgramApplicationStatus.pending,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        partnerGroup: true,
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

    if (!programApplication?.partner) {
      console.warn(
        `No pending application found for partner ${partnerId} in program ${programId}.`,
      );
      return;
    }

    const { program } = programApplication;
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
      applicationId: programApplication.id,
      program: {
        name: program.name,
        description: program.description,
      },
      partner: programApplication.partner,
      application: programApplication,
      landerData: programApplication.partnerGroup?.landerData,
      screeningCriteria,
    });
  },
});
