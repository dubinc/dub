"use server";

import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { qstash } from "@/lib/cron";
import { getPlanCapabilities } from "@/lib/plan-capabilities";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import {
  MessageSchema,
  messagePartnerSchema,
} from "../../zod/schemas/messages";
import { authActionClient } from "../safe-action";

const schema = messagePartnerSchema.extend({
  workspaceId: z.string(),
});

// Message a partner
export const messagePartnerAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { partnerId, text, createdAt } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);
    if (!getPlanCapabilities(workspace.plan).canMessagePartners) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "Messaging is only available on Advanced and Enterprise plans. Upgrade to get access.",
      });
    }

    // Make sure partner is either discoverable, enrolled in the program, or already has a message with the program
    await prisma.partner.findFirstOrThrow({
      where: {
        id: partnerId,
        OR: [
          {
            discoverableAt: {
              not: null,
            },
          },
          {
            programs: {
              some: {
                programId,
              },
            },
          },
          {
            messages: {
              some: {
                programId,
              },
            },
          },
        ],
      },
    });

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
      qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/messages/notify-partner`,
        body: {
          programId,
          partnerId,
          lastMessageId: message.id,
        },
        delay: 60 * 3, // 3 minute delay for a chance to read + batching multiple messages
      }),
    );

    return {
      message: MessageSchema.parse(message),
    };
  });
