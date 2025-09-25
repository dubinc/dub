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

  const res = await prisma.$transaction(async (tx) => {
    // TODO: refactor this to use findUnique once we add `emailId` as a unique index
    await tx.notificationEmail.updateMany({
      where: {
        emailId,
        openedAt: null,
      },
      data: {
        openedAt: new Date(),
      },
    });
    const notificationEmail = await tx.notificationEmail.findFirst({
      where: {
        emailId,
      },
    });

    console.log(
      `Found notification email: ${JSON.stringify(notificationEmail)}`,
    );

    if (
      !notificationEmail ||
      !notificationEmail.programId ||
      !notificationEmail.partnerId
    ) {
      return;
    }

    return await tx.message.updateMany({
      where: {
        programId: notificationEmail.programId,
        partnerId: notificationEmail.partnerId,
        readInEmail: null,
        createdAt: {
          lte: notificationEmail.createdAt,
        },
      },
      data: {
        readInEmail: new Date(),
      },
    });
  });

  console.log(res);
}
