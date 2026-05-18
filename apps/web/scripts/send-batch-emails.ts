import { generateUnsubscribeToken } from "@/lib/email/unsubscribe-token";
import DubLaunchWeekDay1 from "@dub/email/templates/broadcasts/launch-week-day-1";
import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";
import { queueBatchEmail } from "../lib/email/queue-batch-email";

async function main() {
  while (true) {
    const usersToNotify = await prisma.user.findMany({
      where: {
        sentMail: false,
        projects: {
          some: {
            project: {
              OR: [
                {
                  defaultProgramId: {
                    not: null,
                  },
                },
                {
                  plan: {
                    not: "free",
                  },
                },
              ],
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

    const res = await queueBatchEmail<typeof DubLaunchWeekDay1>(
      usersToNotify.map((user) => ({
        to: user.email!,
        subject: "Dub Launch Week Day 1: Introducing Partner Referrals",
        templateName: "DubLaunchWeekDay1",
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
