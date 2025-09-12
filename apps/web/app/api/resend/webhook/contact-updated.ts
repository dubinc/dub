import { prisma } from "@dub/prisma";

export async function contactUpdated({
  email,
  unsubscribed,
}: {
  email: string;
  unsubscribed: boolean;
}) {
  if (!email) {
    return;
  }

  console.log(
    `${email} ${unsubscribed ? "unsubscribed from" : "subscribed to"} mailing list. Updating user...`,
  );

  await prisma.user.update({
    where: {
      email,
    },
    data: {
      subscribed: !unsubscribed,
    },
  });
}
