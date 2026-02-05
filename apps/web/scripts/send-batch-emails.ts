import ConnectPlatformsReminder from "@dub/email/templates/connect-platforms-reminder";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { queueBatchEmail } from "../lib/email/queue-batch-email";
import { generateUnsubscribeToken } from "../lib/email/unsubscribe-token";

async function main() {
  const usersToNotify = await prisma.user.findMany({
    where: {
      notificationPreferences: {
        partnerAccount: true,
      },
      partners: {
        some: {},
      },
    },
  });
  console.log(`Found ${usersToNotify.length} users to notify`);

  const res = await queueBatchEmail<typeof ConnectPlatformsReminder>(
    usersToNotify.map((user) => ({
      to: user.email!,
      subject: "Verify your social platforms on Dub Partners",
      variant: "marketing",
      templateName: "ConnectPlatformsReminder",
      templateProps: {
        email: user.email!,
        unsubscribeUrl: `https://partners.dub.co/unsubscribe/${generateUnsubscribeToken(user.email!)}`,
      },
    })),
  );

  console.log(res);
}

main();
