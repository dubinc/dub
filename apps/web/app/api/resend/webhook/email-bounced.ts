import { prisma } from "@dub/prisma";

export async function emailBounced({
  email_id: emailId,
  tags,
}: {
  email_id: string;
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

  const res = await prisma.notificationEmail.update({
    where: {
      emailId,
    },
    data: {
      bouncedAt: new Date(),
    },
  });

  console.log(
    `Updated notification email ${res.id} with Resend email id ${emailId} to bouncedAt: ${res.bouncedAt}`,
  );
}
