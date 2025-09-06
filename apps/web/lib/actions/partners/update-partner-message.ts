"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@dub/prisma";
import { updatePartnerMessageSchema } from "../../zod/schemas/messages";
import { authActionClient } from "../safe-action";

// Update a partner message
export const updatePartnerMessageAction = authActionClient
  .schema(updatePartnerMessageSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { messageId, readInApp, readInEmail } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    await prisma.message.update({
      where: {
        id: messageId,
        programId,
      },
      data: {
        ...(readInApp !== undefined && {
          readInApp: readInApp ? new Date() : null,
        }),
        ...(readInEmail !== undefined && {
          readInEmail: readInEmail ? new Date() : null,
        }),
      },
    });
  });
