import "dotenv-flow/config";
import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

async function main() {
  // Step 1: Set all existing performance bounties to all-time stats
  await prisma.bounty.updateMany({
    where: {
      type: "performance",
    },
    data: {
      currentStatsOnly: false,
    },
  });

  const bounties = await prisma.bounty.findMany({
    where: {
      type: "performance",
    },
  });

  // Step 2: Create the draft bounty submission for performance bounties
  for (const bounty of bounties) {
    qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/bounties/create-draft-submissions`,
      body: {
        bountyId: bounty.id,
      },
    });

    console.log(
      `Enqueued /api/cron/bounties/create-draft-submissions for the bounty ${bounty.id}`,
    );
  }
}

main();
