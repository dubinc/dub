"use server";

import { prisma } from "@dub/prisma";
import z from "../../zod";
import { authActionClient } from "../safe-action";

const deleteProgramInviteSchema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
  partnerId: z.string(),
});

export const deleteProgramInviteAction = authActionClient
  .schema(deleteProgramInviteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { programId, partnerId } = parsedInput;
    const { workspace } = ctx;

    const { program, partner, ...programEnrollment } =
      await prisma.programEnrollment.findUniqueOrThrow({
        where: {
          partnerId_programId: {
            partnerId,
            programId,
          },
        },
        include: {
          program: true,
          partner: true,
        },
      });

    if (program.workspaceId !== workspace.id) {
      throw new Error("Program not found.");
    }

    if (programEnrollment.status !== "invited") {
      throw new Error("Invite not found.");
    }

    await prisma.$transaction([
      prisma.programEnrollment.delete({
        where: {
          id: programEnrollment.id,
        },
      }),

      prisma.link.deleteMany({
        where: {
          partnerId: partner.id,
          programId,
        },
      }),
    ]);
  });
