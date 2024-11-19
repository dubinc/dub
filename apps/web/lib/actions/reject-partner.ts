"use server";

import { prisma } from "@/lib/prisma";
import { getProgramOrThrow } from "../api/programs/get-program";
import z from "../zod";
import { authActionClient } from "./safe-action";

const rejectPartnerSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  partnerId: z.string(),
});

// Reject a pending partner
export const rejectPartner = authActionClient
  .schema(rejectPartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId, partnerId } = parsedInput;

    try {
      await getProgramOrThrow({
        workspaceId: workspace.id,
        programId,
      });

      const programEnrollment = await prisma.programEnrollment.findUnique({
        where: {
          partnerId_programId: {
            partnerId,
            programId,
          },
        },
      });

      if (!programEnrollment) throw new Error("Program enrollment not found");

      if (programEnrollment.status !== "pending")
        throw new Error("Program enrollment is not pending");

      await prisma.programEnrollment.update({
        where: {
          id: programEnrollment.id,
        },
        data: {
          status: "rejected",
          linkId: null,
        },
      });

      // TODO: [partners] Notify partner of rejection?
    } catch (e) {
      return { ok: false, error: e.message };
    }

    return { ok: true };
  });
