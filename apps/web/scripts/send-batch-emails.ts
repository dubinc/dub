import StablecoinPayoutsAnnouncement from "@dub/email/templates/broadcasts/stablecoin-payouts-announcement";
import { prisma } from "@dub/prisma";
import { chunk, STABLECOIN_SUPPORTED_COUNTRIES } from "@dub/utils";
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
          some: {
            partner: {
              country: {
                in: STABLECOIN_SUPPORTED_COUNTRIES,
              },
            },
          },
        },
      },
      take: 10000,
    });
    if (usersToNotify.length === 0) {
      console.log("No more users to notify");
      break;
    }
    console.log(`Found ${usersToNotify.length} users to notify`);

    const res = await queueBatchEmail<typeof StablecoinPayoutsAnnouncement>(
      usersToNotify.map((user) => ({
        to: user.email!,
        subject: "Introducing Stablecoin Payouts",
        variant: "marketing",
        templateName: "StablecoinPayoutsAnnouncement",
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
