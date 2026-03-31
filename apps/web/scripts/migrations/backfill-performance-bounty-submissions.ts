import { qstash } from "@/lib/cron";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  // Step 1: Set all existing performance bounties to lifetime stats
  await prisma.bounty.updateMany({
    where: {
      type: "performance",
    },
    data: {
      performanceScope: "lifetime",
    },
  });

  const bounties = await prisma.bounty.findMany({
    where: {
      type: "performance",
    },
  });

  // Step 2: Create the draft bounty submission for performance bounties
  for (const bounty of bounties) {
    const response = await qstash.publishJSON({
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/bounties/create-draft-submissions`,
      body: {
        bountyId: bounty.id,
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log(
      `Enqueued /api/cron/bounties/create-draft-submissions for the bounty ${bounty.id}`,
      response,
    );
  }
}

main();
