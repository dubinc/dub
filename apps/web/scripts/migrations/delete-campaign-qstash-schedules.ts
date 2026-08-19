// @ts-ignore
import "dotenv-flow/config";

import { qstash } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { CampaignStatus, CampaignType } from "@prisma/client";

async function main() {
  await deleteTransactionalCampaignQstashSchedules();
  await markStuckSendingCampaignsAsSent();
}

// Remove the existing schedules from QStash
async function deleteTransactionalCampaignQstashSchedules() {
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

// Marketing campaigns that started sending in mid-March 2026 and never
// flipped to `sent` after the next QStash batch failed (~665 / ~673 emails already
// delivered). Mark these campaigns as `sent` so they leave the in-progress UI and a stray QStash retry cannot continue.
async function markStuckSendingCampaignsAsSent() {
  const stuckSendingCampaignIds = [
    "cmp_1KKSXA2G25J2KBNGZQERMAPEX",
    "cmp_1KKZ458FAK2PY9W9677TT3VS2",
  ];

  const campaigns = await prisma.campaign.findMany({
    where: {
      id: {
        in: stuckSendingCampaignIds,
      },
    },
    select: {
      id: true,
      name: true,
      status: true,
      scheduledAt: true,
      updatedAt: true,
    },
  });

  console.table(campaigns);

  const result = await prisma.campaign.updateMany({
    where: {
      id: {
        in: stuckSendingCampaignIds,
      },
      status: CampaignStatus.sending,
    },
    data: {
      status: CampaignStatus.sent,
    },
  });

  console.log(`Marked ${result.count} stuck sending campaigns as sent.`);
}

main();
