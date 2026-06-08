"use server";

import { createId } from "@/lib/api/create-id";
import { qstash } from "@/lib/cron";
import { sendMessageAsPartner } from "@/lib/integrations/intercom/forward-message";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK, INTERCOM_INTEGRATION_ID } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import {
  MessageSchema,
  messageProgramSchema,
} from "../../zod/schemas/messages";
import { authPartnerActionClient } from "../safe-action";

// Message a program
export const messageProgramAction = authPartnerActionClient
  .inputSchema(messageProgramSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { partner, user } = ctx;
    const { programSlug, text } = parsedInput;

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

        Promise.all([
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
            sendMessageAsPartner({
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
