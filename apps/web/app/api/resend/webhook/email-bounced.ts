import { prisma } from "@dub/prisma";

export async function emailBounced({
  email_id: emailId,
  subject,
  tags,
}: {
  email_id: string;
  subject?: string;
  tags?: Record<string, string>;
}) {
  if (tags?.type !== "notification-email") {
    console.log(
      `Ignoring email.bounced webhook for email ${emailId} because it's not a notification email...`,
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
      `notificationEmail ${emailId} not found for email.bounced webhook.`,
    );
    return;
  }

  if (notificationEmail.bouncedAt) {
    return;
  }

  await prisma.notificationEmail.update({
    where: {
      emailId,
    },
    data: {
      bouncedAt: new Date(),
    },
  });
}
