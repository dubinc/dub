import { prisma } from "@dub/prisma";

export async function emailOpened({
  email_id: emailId,
  tags,
}: {
  email_id: string;
  tags?: Record<string, string>;
}) {
  // Ignore if not a message notification
  if (!tags || tags.type !== "message-notification") {
    console.log(
      `Ignoring email.opened webhook for email ${emailId} because it's not a message-notification...`,
    );
    return;
  }

  console.log(
    `Updating notification email read statuses for email ${emailId}...`,
  );

  const res = await prisma.$transaction(async (tx) => {
    const notificationEmail = await tx.notificationEmail.update({
      where: {
        emailId,
        openedAt: null,
      },
      data: {
        openedAt: new Date(),
      },
    });

    console.log(
      `Updated notification email ${notificationEmail.id} with Resend email id ${emailId} to opened at ${new Date()}`,
    );

    // TODO: remove this once we make programId and partnerId required
    if (!notificationEmail.programId || !notificationEmail.partnerId) {
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

  console.log(res);
}
