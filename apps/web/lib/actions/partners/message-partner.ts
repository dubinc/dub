"use server";

import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { prisma } from "@dub/prisma";
import { messagePartnerSchema } from "../../zod/schemas/messages";
import { authActionClient } from "../safe-action";

// Message a partner
export const messagePartnerAction = authActionClient
  .schema(messagePartnerSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId, text } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);
    await getProgramEnrollmentOrThrow({ programId, partnerId });

    await prisma.message.create({
      data: {
        id: createId({ prefix: "msg_" }),
        programId,
        partnerId,
        senderUserId: user.id,
        text,
      },
    });

    // TODO: [Messages] Send email to partner and track read status
  });
