"use server";

import { prisma } from "@dub/prisma";
import * as z from "zod/v4";
import { authPartnerActionClient } from "../safe-action";

const declineProgramInviteSchema = z.object({
  programId: z.string(),
});

export const declineProgramInviteAction = authPartnerActionClient
  .inputSchema(declineProgramInviteSchema)
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
        status: "declined",
      },
    });
  });
