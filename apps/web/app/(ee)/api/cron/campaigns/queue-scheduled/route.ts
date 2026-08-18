import { isScheduledWorkflow } from "@/lib/api/workflows/utils";
import { CRON_BATCH_SIZE, qstash } from "@/lib/cron";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";
import { CampaignStatus, CampaignType } from "@prisma/client";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

// GET /api/cron/campaigns/queue-scheduled
// Fans out due marketing broadcasts and (on the 12h tick) scheduled transactional workflows.
export const GET = withCron(async () => {
  const now = new Date();

  await Promise.all([
    queueTransactionalCampaigns(now),
    queueMarketingCampaigns(now),
  ]);

  return logAndRespond("Finished the campaigns queueing process.");
});

async function queueTransactionalCampaigns(now: Date) {
  // Matches the 12h enrollment window in executeSendCampaignWorkflow.
  if (now.getUTCMinutes() !== 0 || now.getUTCHours() % 12 !== 0) {
    console.log("[Transactional] Not the 12h tick, skipping campaigns.");
    return;
  }

  let queued = 0;
  let page = 0;

  while (true) {
    const campaigns = await prisma.campaign.findMany({
      where: {
        type: CampaignType.transactional,
        status: CampaignStatus.active,
        workflow: {
          disabledAt: null,
        },
      },
      select: {
        workflow: {
          select: {
            id: true,
            triggerConditions: true,
            actions: true,
          },
        },
      },
      take: CRON_BATCH_SIZE,
      skip: page * CRON_BATCH_SIZE,
      orderBy: {
        id: "asc",
      },
    });

    if (campaigns.length === 0) {
      console.log("[Transactional] No more campaigns to queue.");
      break;
    }

    const scheduledWorkflows = campaigns.flatMap((campaign) =>
      campaign.workflow && isScheduledWorkflow(campaign.workflow)
        ? [campaign.workflow]
        : [],
    );

    if (scheduledWorkflows.length > 0) {
      await qstash.batchJSON(
        scheduledWorkflows.map((workflow) => ({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/workflows/${workflow.id}`,
          deduplicationId: workflow.id,
          flowControl: {
            key: "execute-scheduled-workflow",
            parallelism: 10,
          },
          body: {},
        })),
      );

      queued += scheduledWorkflows.length;
    }

    page++;
  }

  console.log(`[Transactional] Queued ${queued} campaigns.`);
}

async function queueMarketingCampaigns(now: Date) {
  let queued = 0;
  let page = 0;

  while (true) {
    const campaigns = await prisma.campaign.findMany({
      where: {
        type: CampaignType.marketing,
        status: CampaignStatus.scheduled,
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
      },
      select: {
        id: true,
      },
      take: CRON_BATCH_SIZE,
      skip: page * CRON_BATCH_SIZE,
      orderBy: {
        id: "asc",
      },
    });

    if (campaigns.length === 0) {
      console.log("[Marketing] No more campaigns to queue.");
      break;
    }

    await qstash.batchJSON(
      campaigns.map((campaign) => ({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/campaigns/broadcast`,
        deduplicationId: campaign.id,
        flowControl: {
          key: "broadcast-marketing-campaign",
          parallelism: 1,
        },
        body: {
          campaignId: campaign.id,
        },
      })),
    );

    queued += campaigns.length;
    page++;
  }

  console.log(`[Marketing] Queued ${queued} campaigns.`);
}
