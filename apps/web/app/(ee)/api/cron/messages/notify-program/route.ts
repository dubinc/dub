import { createId } from "@/lib/api/create-id";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { sendBatchEmail } from "@dub/email";
import NewMessageFromPartner from "@dub/email/templates/new-message-from-partner";
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

// POST /api/cron/messages/notify-program
// Notify a program about unread messages from a partner
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
        program: {
          include: {
            workspace: {
              include: {
                users: {
                  include: {
                    user: true,
                  },
                  where: {
                    notificationPreference: {
                      newMessageFromPartner: true,
                    },
                  },
                },
              },
            },
          },
        },
        partner: {
          include: {
            messages: {
              where: {
                programId,
                senderPartnerId: {
                  not: null, // Sent by the partner
                },
                createdAt: {
                  gt: subDays(new Date(), 3), // Sent in the last 3 days
                },
                readInApp: null, // Unread
                readInEmail: null, // Unread
                emails: {
                  none: {}, // No emails sent yet
                },
              },
              include: {
                senderPartner: true,
              },
            },
          },
        },
      },
    });

    const unreadMessages = programEnrollment.partner.messages.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    if (unreadMessages.length === 0)
      return logAndRespond(
        `No unread messages found from partner ${partnerId} in program ${programId}. Skipping...`,
      );

    if (unreadMessages[unreadMessages.length - 1].id !== lastMessageId)
      return logAndRespond(
        `There is a more recent unread message than ${lastMessageId}. Skipping...`,
      );

    const usersToNotify = programEnrollment.program.workspace.users
      .map(({ user }) => user)
      .filter(Boolean) as { email: string; id: string }[];

    if (usersToNotify.length === 0)
      return logAndRespond(
        `No program user emails to notify from partner ${partnerId}. Skipping...`,
      );

    const { program, partner } = programEnrollment;

    const { data, error } = await sendBatchEmail(
      usersToNotify.map(({ email }) => ({
        subject: `${unreadMessages.length === 1 ? "New message from" : `${unreadMessages.length} new messages from`} ${partner.name}`,
        variant: "notifications",
        to: email,
        react: NewMessageFromPartner({
          workspaceSlug: program.workspace.slug,
          partner: {
            id: partner.id,
            name: partner.name,
            image: partner.image,
          },
          messages: unreadMessages.map((message) => ({
            text: message.text,
            createdAt: message.createdAt,
          })),
          email,
        }),
        tags: [{ name: "type", value: "message-notification" }],
      })),
    );

    if (error)
      throw new Error(
        `Error sending message emails to program ${programId} users: ${error.message}`,
      );

    if (!data)
      throw new Error(
        `No data received from sending message emails to program ${programId} users`,
      );

    await prisma.notificationEmail.createMany({
      data: usersToNotify.map(({ id: userId }, idx) => ({
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
      `Emails sent for messages from partner ${partnerId} to program ${programId} users.`,
    );
  } catch (error) {
    await log({
      message: `Error notifying program users of new messages: ${error.message}`,
      type: "alerts",
    });

    return handleAndReturnErrorResponse(error);
  }
}
