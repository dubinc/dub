import { prisma } from "@/lib/prisma";
import * as z from "zod/v4";
import { defineJob } from "../index";
import { autoRejectProgramApplicationJob } from "./auto-reject-program-application-job";

const inputSchema = z.object({
  programId: z.string(),
  partnerId: z.string(),
});

// Deprecated: superseded by auto-reject-program-application-job, which is keyed by
// application instead of enrollment. Kept only to drain in-flight QStash messages –
// safe to delete once the queue has caught up.
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
      select: {
        applicationId: true,
      },
    });

    if (!programEnrollment?.applicationId) {
      console.warn(
        `No application found for partner ${partnerId} in program ${programId}.`,
      );
      return;
    }

    await autoRejectProgramApplicationJob.dispatch(
      {
        applicationId: programEnrollment.applicationId,
      },
      {
        label: partnerId,
      },
    );
  },
});
