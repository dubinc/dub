import IdentityVerificationAnnouncement from "@dub/email/templates/broadcasts/identity-verification-announcement";
import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";
import { queueBatchEmail } from "../lib/email/queue-batch-email";

async function main() {
  while (true) {
    const usersToNotify = await prisma.user.findMany({
      where: {
        sentMail: false,
        partners: {
          some: {
            partner: {
              payouts: {
                some: {
                  status: "completed",
                  amount: {
                    gt: 10000,
                  },
                },
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

    const res = await queueBatchEmail<typeof IdentityVerificationAnnouncement>(
      usersToNotify.map((user) => ({
        to: user.email!,
        subject: "Action Required: Verify your identity on Dub",
        templateName: "IdentityVerificationAnnouncement",
        templateProps: {
          email: user.email!,
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
