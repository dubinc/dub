"use server";

import { createId } from "@/lib/api/create-id";
import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { authPartnerActionClient } from "../actions/safe-action";
import { MessageSchema, messageProgramSchema } from "./schemas";

const schema = messageProgramSchema.refine(
  (data) => data.text.trim().length > 0 || data.attachments.length > 0,
  { message: "Message must contain text or at least one attachment." },
);

// Message a program
export const messageProgramAction = authPartnerActionClient
  .inputSchema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { partner, user } = ctx;
    const { programSlug, text, attachments } = parsedInput;

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

    const keyPrefix = `messages/${program.id}/`;

    for (const attachment of attachments) {
      if (!attachment.storageKey.startsWith(keyPrefix)) {
        throw new Error("Invalid attachment storage key.");
      }
    }

    const message = await prisma.message.create({
      data: {
        id: createId({ prefix: "msg_" }),
        programId: program.id,
        partnerId: partner.id,
        senderPartnerId: partner.id,
        senderUserId: user.id,
        text,
        ...(attachments.length > 0 && {
          attachments: {
            create: attachments.map((att) => ({
              id: createId({ prefix: "msa_" }),
              storageKey: att.storageKey,
              name: att.name,
              size: att.size,
              type: att.type,
            })),
          },
        }),
      },
      include: {
        senderUser: true,
        senderPartner: true,
        attachments: true,
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
