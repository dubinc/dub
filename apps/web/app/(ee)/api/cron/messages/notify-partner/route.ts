import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { resend } from "@dub/email/resend";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
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
                emails: {
                  none: {}, // No emails sent yet
                },
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

    const unreadMessages = programEnrollment.partner.messages.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
    );

    if (unreadMessages.length === 0)
      return logAndRespond(
        `No unread messages found for partner ${partnerId} in program ${programId}. Skipping...`,
      );

    if (unreadMessages[unreadMessages.length - 1].id !== lastMessageId)
      return logAndRespond(
        `There is a more recent unread message than ${lastMessageId}. Skipping...`,
      );

    const partnerEmailsToNotify = programEnrollment.partner.users
      .map(({ user }) => user.email)
      .filter(Boolean) as string[];

    if (partnerEmailsToNotify.length === 0)
      return logAndRespond(
        `No partner emails to notify for partner ${partnerId}. Skipping...`,
      );

    const program = programEnrollment.program;

    const { data, error } = await resend.batch.send(
      partnerEmailsToNotify.map((email) => ({
        subject: `${program.name} sent ${unreadMessages.length === 1 ? "a message" : `${unreadMessages.length} messages`}`,
        from: VARIANT_TO_FROM_MAP.notifications,
        to: email,
        react: NewMessageFromProgram({
          program: {
            name: program.name,
            logo: program.logo,
            slug: program.slug,
          },
          messages: unreadMessages.map((message) => ({
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
        tags: [{ name: "type", value: "message-notification" }],
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
      data: unreadMessages.flatMap((message) =>
        data.data.map(({ id }) => ({
          type: NotificationEmailType.Message,
          emailId: id,
          messageId: message.id,
        })),
      ),
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
