import { prisma } from "@dub/prisma";

export async function emailOpened({
  email_id: emailId,
  tags,
  subject,
}: {
  email_id: string;
  tags?: Record<string, string>;
  subject?: string;
}) {
  if (tags?.type !== "notification-email") {
    console.log(
      `Ignoring email.opened webhook for email ${emailId} because it's not a notification email...`,
    );
    return;
  }

  const notificationEmail = await prisma.notificationEmail.findUnique({
    where: {
      emailId,
    },
  });

  if (!notificationEmail) {
    console.log(
      `Ignoring email.opened webhook for email ${emailId} because it's not a notification email...`,
    );
    return;
  }

  if (notificationEmail.openedAt) {
    console.log(
      `Ignoring email.opened webhook for email ${emailId} because it already has an openedAt timestamp: ${notificationEmail.openedAt}`,
    );
    return;
  }

  console.log(
    `Updating notification email read statuses for email ${emailId}. Subject: ${subject}`,
  );

  const res = await prisma.$transaction(async (tx) => {
    const notificationEmail = await tx.notificationEmail.update({
      where: {
        emailId,
      },
      data: {
        openedAt: new Date(),
      },
    });

    console.log(
      `Updated notification email ${notificationEmail.id} with Resend email id ${emailId} to openedAt: ${notificationEmail.openedAt}`,
    );

    if (
      !notificationEmail.programId ||
      !notificationEmail.partnerId ||
      !notificationEmail.messageId
    ) {
      return notificationEmail;
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

  console.log(
    `Finished processing email.opened webhook for email ${emailId}: ${JSON.stringify(res, null, 2)}`,
  );
}
