"use server";

import { prisma } from "@dub/prisma";
import * as z from "zod/v4";
import { authPartnerActionClient } from "../safe-action";

export const withdrawPartnerApplicationAction = authPartnerActionClient
  .inputSchema(
    z.object({
      programId: z.string(),
    }),
  )
  .action(async ({ ctx, parsedInput }) => {
    const { programId } = parsedInput;
    const { partner } = ctx;

    const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
      where: {
        partnerId_programId: {
          partnerId: partner.id,
          programId,
        },
      },
    });

    if (programEnrollment.status !== "pending") {
      throw new Error(
        "You can only withdraw your application if it's still pending.",
      );
    }

    await prisma.$transaction(async (tx) => {
      const deletedProgramEnrollment = await tx.programEnrollment.delete({
        where: {
          id: programEnrollment.id,
        },
      });

      if (programEnrollment.applicationId) {
        await tx.programApplication.delete({
          where: {
            id: programEnrollment.applicationId,
          },
        });
      }

      return deletedProgramEnrollment;
    });
  });
