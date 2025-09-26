import { createId } from "@/lib/api/create-id";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { sendBatchEmail } from "@dub/email";
import NewMessageFromProgram from "@dub/email/templates/new-message-from-program";
import { prisma } from "@dub/prisma";
import { NotificationEmailType } from "@dub/prisma/client";
import { log } from "@dub/utils";
import { subDays } from "date-fns";
import { z } from "zod";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

const schema = z.object({
  programId: z.string(),
  partnerId: z.string(),
  lastMessageId: z.string(),
});

// POST /api/cron/messages/notify-partner
// Notify a partner about unread messages from a program
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const { programId, partnerId, lastMessageId } = schema.parse(
      JSON.parse(rawBody),
    );

    const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
        status: "approved",
      },
      include: {
        program: true,
        partner: {
          include: {
            messages: {
              where: {
                programId,
                senderPartnerId: null, // Not sent by the partner
                createdAt: {
                  gt: subDays(new Date(), 3), // Sent in the last 3 days
                },
                readInApp: null, // Unread
                readInEmail: null, // Unread
              },
              orderBy: {
                createdAt: "desc",
              },
              include: {
                senderUser: true,
              },
            },
            users: {
              include: {
                user: true,
              },
              where: {
                notificationPreferences: {
                  newMessageFromProgram: true,
                },
              },
            },
          },
        },
      },
    });

    // unread messages are already sorted by latest message first
    const unreadMessages = programEnrollment.partner.messages;

    if (unreadMessages.length === 0)
      return logAndRespond(
        `No unread messages found for partner ${partnerId} in program ${programId}. Skipping...`,
      );

    // if the latest unread message is not the last message id, skip
    if (unreadMessages[0].id !== lastMessageId)
      return logAndRespond(
        `There is a more recent unread message than ${lastMessageId}. Skipping...`,
      );

    const partnerUsersToNotify = programEnrollment.partner.users
      .map(({ user }) => user)
      .filter(Boolean) as { email: string; id: string }[];

    if (partnerUsersToNotify.length === 0)
      return logAndRespond(
        `No partner emails to notify for partner ${partnerId}. Skipping...`,
      );

    const program = programEnrollment.program;

    const { data, error } = await sendBatchEmail(
      partnerUsersToNotify.map(({ email }) => ({
        subject: `${program.name} sent ${unreadMessages.length === 1 ? "a message" : `${unreadMessages.length} messages`}`,
        variant: "notifications",
        to: email,
        react: NewMessageFromProgram({
          program: {
            name: program.name,
            logo: program.logo,
            slug: program.slug,
          },
          // can potentially replace this with `.toReversed()` once it's more widely supported
          messages: [...unreadMessages].reverse().map((message) => ({
            text: message.text,
            createdAt: message.createdAt,
            user: message.senderUser.name
              ? {
                  name: message.senderUser.name,
                  image: message.senderUser.image,
                }
              : {
                  name: program.name,
                  image: program.logo,
                },
          })),
          email,
        }),
        tags: [{ name: "type", value: "notification-email" }],
      })),
    );

    if (error)
      throw new Error(
        `Error sending message emails to partner ${partnerId}: ${error.message}`,
      );

    if (!data)
      throw new Error(
        `No data received from sending message emails to partner ${partnerId}`,
      );

    await prisma.notificationEmail.createMany({
      data: partnerUsersToNotify.map(({ id: userId }, idx) => ({
        id: createId({ prefix: "em_" }),
        type: NotificationEmailType.Message,
        emailId: data.data[idx].id,
        messageId: lastMessageId,
        programId,
        partnerId,
        recipientUserId: userId,
      })),
    });

    return logAndRespond(
      `Emails sent for messages from program ${programId} to partner ${partnerId}.`,
    );
  } catch (error) {
    await log({
      message: `Error notifying partner of new messages: ${error.message}`,
      type: "alerts",
    });

    return handleAndReturnErrorResponse(error);
  }
}
