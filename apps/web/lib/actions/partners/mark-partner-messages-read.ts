"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authActionClient } from "../safe-action";

// Mark partner messages as read
export const markPartnersMessagesReadAction = authActionClient
  .schema(z.object({ workspaceId: z.string(), partnerId: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { partnerId } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    await prisma.message.updateMany({
      where: {
        partnerId,
        programId,
        senderPartnerId: {
          not: null,
        },
      },
      data: {
        readInApp: new Date(),
      },
    });
  });
