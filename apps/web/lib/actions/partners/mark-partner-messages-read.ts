"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { prisma } from "@dub/prisma";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const schema = z.object({
  workspaceId: z.string(),
  partnerId: z.string(),
});

// Mark partner messages as read
export const markPartnerMessagesReadAction = authActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { partnerId } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredPermissions: ["messages.read"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    await prisma.message.updateMany({
      where: {
        partnerId,
        programId,
        readInApp: null,
        senderPartnerId: {
          not: null,
        },
      },
      data: {
        readInApp: new Date(),
      },
    });
  });
