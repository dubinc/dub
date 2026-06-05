import { createId } from "@/lib/api/create-id";
import { qstash } from "@/lib/cron";
import { intercomWebhookSchema } from "@/lib/integrations/intercom/schema";
import { prisma } from "@dub/prisma";
import { Message, Program } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK, pluralize } from "@dub/utils";
import * as z from "zod/v4";

type IntercomWebhookData = z.infer<typeof intercomWebhookSchema>["data"];

type Result = {
  message: string;
};

export async function handleConversationAdminReplied({
  data,
  program,
}: {
  data: IntercomWebhookData;
  program: Pick<Program, "id">;
}): Promise<Result> {
  const contactIds = data.item.contacts.contacts.map((contact) => contact.id);

  const programEnrollments = await prisma.programEnrollment.findMany({
    where: {
      intercomContactId: {
        in: contactIds,
      },
    },
    select: {
      partnerId: true,
      programId: true,
    },
  });

  // TODO:
  // Attach intercomContactId to the program enrollment if not found
  // and forward the message to the partner

  if (programEnrollments.length === 0) {
    return {
      message: `No program enrollments found for ${pluralize("contact", contactIds.length)} ${contactIds.join(", ")}. Skipping message forwarding.`,
    };
  }

  const messagesCreated: Pick<Message, "id" | "programId" | "partnerId">[] = [];
  const { conversation_parts: conversations } = data.item.conversation_parts;

  for (const { body, attachments } of conversations) {
    let originalMessage = body.replaceAll(/\[(Image|Attachment|GIF)\]/g, "");

    if (attachments.length > 0) {
      originalMessage += `\n\n${attachments.map((attachment) => attachment.url).join(", ")}`;
    }

    if (originalMessage.trim() === "") {
      continue;
    }

    const messages = await Promise.all(
      programEnrollments.map(({ programId, partnerId }) =>
        prisma.message.create({
          data: {
            id: createId({ prefix: "msg_" }),
            programId,
            partnerId,
            senderUserId: "user_cludszk1h0000wmd2e0ea2b0p", // FIX
            text: originalMessage,
          },
          select: {
            id: true,
            programId: true,
            partnerId: true,
          },
        }),
      ),
    );

    messagesCreated.push(...messages);
  }

  await Promise.all(
    messagesCreated.map((message) =>
      qstash.publishJSON({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/messages/notify-partner`,
        body: {
          programId: message.programId,
          partnerId: message.partnerId,
          lastMessageId: message.id,
        },
        delay: 60 * 3, // 3 minute delay for a chance to read + batching multiple messages
      }),
    ),
  );

  return {
    message: `Message forwarded to ${pluralize("partner", messagesCreated.length)}.`,
  };
}

// Skip body [Image]
