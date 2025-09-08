"use server";

import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import {
  MessageSchema,
  messagePartnerSchema,
} from "../../zod/schemas/messages";
import { authActionClient } from "../safe-action";

// Message a partner
export const messagePartnerAction = authActionClient
  .schema(messagePartnerSchema.extend({ workspaceId: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId, text, createdAt } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);
    await getProgramEnrollmentOrThrow({ programId, partnerId });

    const message = await prisma.message.create({
      data: {
        id: createId({ prefix: "msg_" }),
        programId,
        partnerId,
        senderUserId: user.id,
        text,
        createdAt,
      },
      include: {
        senderUser: true,
        senderPartner: true,
      },
    });

    waitUntil(
      (async () => {
        await qstash.publishJSON({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/messages/notify-partner`,
          body: {
            programId,
            partnerId,
            lastMessageId: message.id,
          },
          delay: 60 * 3, // 3 minute delay for a chance to read + batching multiple messages
        });
      })(),
    );

    return { message: MessageSchema.parse(message) };
  });
