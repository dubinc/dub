"use server";

import { createId } from "@/lib/api/create-id";
import { qstash } from "@/lib/cron";
import { forwardPartnerMessageToIntercom } from "@/lib/integrations/intercom/forward-message";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK, INTERCOM_INTEGRATION_ID } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { authPartnerActionClient } from "../actions/safe-action";
import { MessageSchema, messageProgramSchema } from "./schemas";
import {
  mapMessageAttachmentsForCreate,
  messageAttachmentsOrderBy,
} from "./utils";

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
        workspaceId: true,
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
            create: mapMessageAttachmentsForCreate(attachments),
          },
        }),
      },
      include: {
        senderUser: true,
        senderPartner: true,
        attachments: {
          orderBy: messageAttachmentsOrderBy,
        },
      },
    });

    waitUntil(
      (async () => {
        const intercomInstallation =
          await prisma.installedIntegration.findFirst({
            where: {
              projectId: program.workspaceId,
              integrationId: INTERCOM_INTEGRATION_ID,
            },
            select: {
              id: true,
              credentials: true,
            },
          });

        await Promise.allSettled([
          // Skip notifying the program of new partner messages when Intercom is connected
          !intercomInstallation &&
            qstash.publishJSON({
              url: `${APP_DOMAIN_WITH_NGROK}/api/cron/messages/notify-program`,
              body: {
                programId: program.id,
                partnerId: partner.id,
                lastMessageId: message.id,
              },
              delay: 60 * 3, // 3 minute delay for a chance to read + batching multiple messages
            }),

          // Forward the message to the Intercom
          intercomInstallation &&
            forwardPartnerMessageToIntercom({
              program,
              partner,
              message,
              intercomInstallation,
            }),
        ]);
      })(),
    );

    return {
      message: MessageSchema.parse(message),
    };
  });
