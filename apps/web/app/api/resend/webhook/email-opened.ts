import { prisma } from "@dub/prisma";

const NOTIFICATION_EMAIL_SUBJECT_KEYWORDS = ["bounty", "message"];

export async function emailOpened({
  email_id: emailId,
  tags,
  subject,
}: {
  email_id: string;
  tags?: Record<string, string>;
  subject?: string;
}) {
  console.log({ emailId, tags, subject });

  // if none of the following conditions are met, ignore the email
  // 1. the tags include "type" with the value "notification-email"
  // 2. the subject contains one of the keywords (TODO remove this soon)
  if (
    !(
      tags?.type === "notification-email" ||
      (subject &&
        NOTIFICATION_EMAIL_SUBJECT_KEYWORDS.some((keyword) =>
          subject.includes(keyword),
        ))
    )
  ) {
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
      `Updated notification email ${notificationEmail.id} with Resend email id ${emailId} to opened at ${new Date()}`,
    );

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
