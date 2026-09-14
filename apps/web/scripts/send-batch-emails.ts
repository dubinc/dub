import { prisma } from "@/lib/prisma";
import DubStartupProgramAnnouncement from "@dub/email/templates/broadcasts/dub-startup-program-announcement";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";
import { queueBatchEmail } from "../lib/email/queue-batch-email";
import { generateUnsubscribeToken } from "../lib/email/unsubscribe-token";

async function main() {
  const workspaces = await prisma.project.findMany({
    where: {
      defaultProgramId: {
        not: null,
      },
      plan: {
        notIn: ["advanced", "enterprise"],
      },
    },
    include: {
      programs: true,
      users: {
        where: {
          user: {
            email: {
              not: null,
            },
            sentMail: false,
            notificationPreferences: {
              dubPartners: true,
            },
          },
        },
        include: {
          user: true,
        },
      },
    },
  });

  const usersToNotify = workspaces.flatMap((workspace) =>
    workspace.users.map((user) => user.user),
  );

  console.log(`Found ${usersToNotify.length} users to notify`);

  const res = await queueBatchEmail<typeof DubStartupProgramAnnouncement>(
    usersToNotify.map((user) => ({
      to: user.email!,
      variant: "marketing",
      subject: "Introducing the Dub Startup Program 🚀",
      templateName: "DubStartupProgramAnnouncement",
      templateProps: {
        email: user.email!,
        unsubscribeUrl: `https://app.dub.co/unsubscribe/${generateUnsubscribeToken(user.email!)}`,
      },
    })),
  );

  console.log(res);

  const chunkedUsersToNotify = chunk(usersToNotify, 1000);
  for (const cu of chunkedUsersToNotify) {
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

main();
