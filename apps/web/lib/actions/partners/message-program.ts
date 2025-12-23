"use server";

import { createId } from "@/lib/api/create-id";
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
    const { programSlug, text } = parsedInput;

    const program = await prisma.program.findFirstOrThrow({
      select: {
        id: true,
      },
      where: {
        slug: programSlug,

        // Partner is not banned from the program
        partners: {
          none: {
            partnerId: partner.id,
            status: "banned",
          },
        },

        OR: [
          // Program has messaging enabled and partner is enrolled
          {
            messagingEnabledAt: {
              not: null,
            },
            partners: {
              some: {
                partnerId: partner.id,
              },
            },
          },

          // Partner has received a direct message from the program before
          {
            messages: {
              some: {
                partnerId: partner.id,
                senderPartnerId: null, // Sent by the program
              },
            },
          },
        ],
      },
    });

    const message = await prisma.message.create({
      data: {
        id: createId({ prefix: "msg_" }),
        programId: program.id,
        partnerId: partner.id,
        senderPartnerId: partner.id,
        senderUserId: user.id,
        text,
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
          programId: program.id,
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
