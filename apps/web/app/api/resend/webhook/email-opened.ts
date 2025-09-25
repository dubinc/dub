import { prisma } from "@dub/prisma";

const NOTIFICATION_EMAIL_SUBJECT_KEYWORDS = ["bounty", "message"];

export async function emailOpened({
  email_id: emailId,
  subject,
  tags,
}: {
  email_id: string;
  subject?: string;
  tags?: Record<string, string>;
}) {
  // TODO: replace this with tags once it's confirmed working
  if (
    !subject ||
    !NOTIFICATION_EMAIL_SUBJECT_KEYWORDS.some((keyword) =>
      subject.includes(keyword),
    )
  ) {
    console.log(
      `Ignoring email.opened webhook for email ${emailId} because it's not a notification email. Subject: ${subject}`,
    );
    return;
  }

  console.log(`Found tags: ${JSON.stringify(tags, null, 2)}`);

  // if (!tags || tags.type !== "notification-email") {
  //   console.log(
  //     `Ignoring email.opened webhook for email ${emailId} because it doesn't have a notification-email tag...`,
  //   );
  //   return;
  // }

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

  console.log(
    `Updating notification email read statuses for email ${emailId}. Subject: ${subject}`,
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

  console.log(
    `Finished processing email.opened webhook for email ${emailId}: ${JSON.stringify(res, null, 2)}`,
  );
}
