import ConnectPlatformsReminder from "@dub/email/templates/connect-platforms-reminder";
import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";
import { queueBatchEmail } from "../lib/email/queue-batch-email";
import { generateUnsubscribeToken } from "../lib/email/unsubscribe-token";

async function main() {
  while (true) {
    const usersToNotify = await prisma.user.findMany({
      where: {
        sentMail: false,
        notificationPreferences: {
          partnerAccount: true,
        },
        partners: {
          some: {},
        },
      },
      take: 10000,
    });
    if (usersToNotify.length === 0) {
      console.log("No more users to notify");
      break;
    }
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

    const chunkedUsers = chunk(usersToNotify, 1000);
    for (const cu of chunkedUsers) {
      const res = await prisma.user.updateMany({
        where: {
          id: {
            in: cu.map((u) => u.id),
          },
        },
        data: {
          sentMail: true,
        },
      });
      console.log(`Updated ${res.count} users to sentMail: true`);
    }
  }
}

main();
