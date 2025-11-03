import { prisma } from "@dub/prisma";

export async function emailDelivered({
  email_id: emailId,
  tags,
}: {
  email_id: string;
  tags?: Record<string, string>;
}) {
  if (tags?.type !== "notification-email") {
    console.log(
      `Ignoring email.delivered webhook for email ${emailId} because it's not a notification email...`,
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
      `notificationEmail ${emailId} not found for email.delivered webhook.`,
    );
    return;
  }

  if (notificationEmail.deliveredAt) {
    return;
  }

  await prisma.notificationEmail.update({
    where: {
      emailId,
    },
    data: {
      deliveredAt: new Date(),
    },
  });
}
