"use server";

import { createId } from "@/lib/api/create-id";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import {
  MessageSchema,
  messageProgramSchema,
} from "../../zod/schemas/messages";
import { authPartnerActionClient } from "../safe-action";

// Message a program
export const messageProgramAction = authPartnerActionClient
  .schema(messageProgramSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { partner, user } = ctx;
    const { programSlug, text, createdAt } = parsedInput;

    const enrollment = await getProgramEnrollmentOrThrow({
      programId: programSlug,
      partnerId: partner.id,
    });

    const message = await prisma.message.create({
      data: {
        id: createId({ prefix: "msg_" }),
        programId: enrollment.programId,
        partnerId: partner.id,
        senderPartnerId: partner.id,
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
      qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/messages/notify-program`,
        body: {
          programId: enrollment.programId,
          partnerId: partner.id,
          lastMessageId: message.id,
        },
        delay: 60 * 3, // 3 minute delay for a chance to read + batching multiple messages
      }),
    );

    return {
      message: MessageSchema.parse(message),
    };
  });
