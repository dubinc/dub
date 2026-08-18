import "dotenv-flow/config";

import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { CampaignType } from "@prisma/client";

// Remove the existing schedules from QStash
async function main() {
  const campaigns = await prisma.campaign.findMany({
    where: {
      type: CampaignType.transactional,
      workflowId: {
        not: null,
      },
    },
    select: {
      id: true,
      workflowId: true,
      status: true,
    },
  });

  console.table(campaigns);

  if (campaigns.length === 0) {
    console.log("No transactional campaigns with a workflowId.");
    return;
  }

  let deleted = 0;
  let skipped = 0;
  let failed = 0;

  for (const { id, workflowId } of campaigns) {
    if (!workflowId) {
      continue;
    }

    try {
      await qstash.schedules.delete(workflowId);
      deleted++;
    } catch (error) {
      console.error(
        `Failed to delete schedule ${workflowId} (campaign ${id}):`,
        error,
      );
      failed++;
    }
  }

  console.log(`Done. deleted=${deleted} skipped=${skipped} failed=${failed}`);
}

main();
