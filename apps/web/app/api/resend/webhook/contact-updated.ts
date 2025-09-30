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

  try {
    const res = await prisma.user.update({
      where: {
        email,
      },
      data: {
        subscribed: !unsubscribed,
      },
    });
    console.log(`Updated user ${email}: ${JSON.stringify(res, null, 2)}`);
  } catch (error) {
    console.error(`Error updating user ${email}: ${error.message}`);
  }
}
