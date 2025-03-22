"use server";

import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

const acceptProgramInviteSchema = z.object({
  partnerId: z.string(),
  programId: z.string(),
});

export const acceptProgramInviteAction = authPartnerActionClient
  .schema(acceptProgramInviteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { partner } = ctx;
    const { programId } = parsedInput;

    await prisma.programEnrollment.update({
      where: {
        partnerId_programId: {
          partnerId: partner.id,
          programId,
        },
        status: "invited",
      },
      data: {
        status: "approved",
      },
      include: {
        links: true,
      },
    });
  });
