import { prisma } from "@dub/prisma";

export async function emailOpened({
  tags,
  email_id: emailId,
}: {
  tags?: Record<string, string>;
  email_id: string;
}) {
  // Ignore if not a message notification
  if (!tags || tags.type !== "message-notification") {
    return;
  }

  console.log(
    `Updating notification email read statuses for email ${emailId}...`,
  );

  await prisma.$transaction([
    prisma.notificationEmail.updateMany({
      where: {
        emailId,
        openedAt: null,
      },
      data: {
        openedAt: new Date(),
      },
    }),

    prisma.message.updateMany({
      where: {
        readInEmail: null,
        emails: {
          some: {
            emailId,
          },
        },
      },
      data: {
        readInEmail: new Date(),
      },
    }),
  ]);
}
