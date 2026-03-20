import DubProductUpdateMar26 from "@dub/email/templates/broadcasts/dub-product-update-mar26";
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
          dubPartners: true,
        },
        projects: {
          some: {
            project: {
              plan: {
                not: "free",
              },
            },
          },
        },
        email: {
          not: null,
        },
      },
      take: 10000,
    });
    if (usersToNotify.length === 0) {
      console.log("No more users to notify");
      break;
    }
    console.log(`Found ${usersToNotify.length} users to notify`);

    const res = await queueBatchEmail<typeof DubProductUpdateMar26>(
      usersToNotify.map((user) => ({
        to: user.email!,
        subject: "Dub Partners Product Updates (Mar '26)",
        variant: "marketing",
        templateName: "DubProductUpdateMar26",
        templateProps: {
          email: user.email!,
          unsubscribeUrl: `https://app.dub.co/unsubscribe/${generateUnsubscribeToken(user.email!)}`,
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
