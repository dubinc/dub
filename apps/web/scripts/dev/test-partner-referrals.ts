import "dotenv-flow/config";

import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

async function main() {
  const payouts = await prisma.payout.findMany({
    where: {
      programId: "prog_1K2J9DRWPPJ2F1RX53N92TSGA",
    },
  });

  await enqueueBatchJobs(
    payouts.map(({ id }) => ({
      queueName: "create-referral-commissions",
      url: `${APP_DOMAIN_WITH_NGROK}/api/cron/commissions/referrals/queue`,
      body: {
        payoutId: id,
      },
    })),
  );
}

main();
