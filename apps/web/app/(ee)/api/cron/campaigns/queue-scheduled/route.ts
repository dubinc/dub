import { isScheduledWorkflow } from "@/lib/api/workflows/utils";
import { CRON_BATCH_SIZE } from "@/lib/cron";
import { enqueueBatchJobs } from "@/lib/cron/enqueue-batch-jobs";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@/lib/prisma";
import {
  APP_DOMAIN_WITH_NGROK,
  isRejected,
  log,
  serializeError,
} from "@dub/utils";
import { CampaignStatus, CampaignType } from "@prisma/client";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";
export const maxDuration = 600;

// GET /api/cron/campaigns/queue-scheduled
// Fans out due marketing broadcasts and (on the 12h tick) scheduled transactional workflows.
export const GET = withCron(async () => {
  const now = new Date();

  const [transactional, marketing] = await Promise.allSettled([
    queueTransactionalCampaigns(now),
    queueMarketingCampaigns(now),
  ]);

  const failures: string[] = [];

  if (isRejected(transactional)) {
    failures.push(`transactional: ${serializeError(transactional.reason)}`);
  }

  if (isRejected(marketing)) {
    failures.push(`marketing: ${serializeError(marketing.reason)}`);
  }

  if (failures.length > 0) {
    const message = `Campaign queueing partially failed: ${failures.join("; ")}`;
    await log({ type: "errors", message });
    return logAndRespond(message, { logLevel: "error" });
  }

  const transactionalQueued =
    transactional.status === "fulfilled" ? transactional.value : 0;
  const marketingQueued =
    marketing.status === "fulfilled" ? marketing.value : 0;

  if (transactionalQueued + marketingQueued === 0) {
    return logAndRespond("No campaigns to queue.");
  }

  return logAndRespond(
    `Queued ${marketingQueued} marketing and ${transactionalQueued} transactional campaigns.`,
  );
});

// First 5 minutes of 00:00/12:00 UTC. QStash dedup lasts 10 minutes, so this
// absorbs Vercel cron jitter without leaking a second publish after expiry.
function isTransactionalTick(now: Date) {
  return now.getUTCHours() % 12 === 0 && now.getUTCMinutes() < 5;
}

async function queueTransactionalCampaigns(now: Date) {
  // Matches the 12h enrollment window in executeSendCampaignWorkflow.
  // 5-minute window absorbs Vercel cron jitter; QStash dedup (10 min) collapses extra publishes.
  if (!isTransactionalTick(now)) {
    return 0;
  }

  let queued = 0;
  let lastCampaignId: string | undefined;

  while (true) {
    const campaigns = await prisma.campaign.findMany({
      where: {
        type: CampaignType.transactional,
        status: CampaignStatus.active,
        workflow: {
          disabledAt: null,
        },
        ...(lastCampaignId && { id: { gt: lastCampaignId } }),
      },
      select: {
        id: true,
        workflow: {
          select: {
            id: true,
            triggerConditions: true,
            actions: true,
          },
        },
      },
      take: CRON_BATCH_SIZE,
      orderBy: {
        id: "asc",
      },
    });

    if (campaigns.length === 0) {
      break;
    }

    const scheduledWorkflows = campaigns.flatMap((campaign) =>
      campaign.workflow && isScheduledWorkflow(campaign.workflow)
        ? [campaign.workflow]
        : [],
    );

    if (scheduledWorkflows.length > 0) {
      await enqueueBatchJobs(
        scheduledWorkflows.map((workflow) => ({
          url: `${APP_DOMAIN_WITH_NGROK}/api/cron/workflows/${workflow.id}`,
          deduplicationId: workflow.id,
          label: "execute-scheduled-workflow",
          flowControl: {
            key: "execute-scheduled-workflow",
            parallelism: 10,
          },
          body: {},
        })),
      );

      queued += scheduledWorkflows.length;
    }

    lastCampaignId = campaigns[campaigns.length - 1].id;
  }

  return queued;
}

async function queueMarketingCampaigns(now: Date) {
  let queued = 0;
  let lastCampaignId: string | undefined;

  while (true) {
    const campaigns = await prisma.campaign.findMany({
      where: {
        type: CampaignType.marketing,
        // Do not reclaim `sending` campaigns; failures Slack-alert and we resume them manually.
        status: CampaignStatus.scheduled,
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: now } }],
        ...(lastCampaignId && { id: { gt: lastCampaignId } }),
      },
      select: {
        id: true,
      },
      take: CRON_BATCH_SIZE,
      orderBy: {
        id: "asc",
      },
    });

    if (campaigns.length === 0) {
      break;
    }

    await enqueueBatchJobs(
      campaigns.map((campaign) => ({
        url: `${APP_DOMAIN_WITH_NGROK}/api/cron/campaigns/broadcast`,
        label: "broadcast-marketing-campaign",
        flowControl: {
          key: `broadcast-marketing-campaign-${campaign.id}`,
          parallelism: 1,
        },
        body: {
          campaignId: campaign.id,
        },
      })),
    );

    queued += campaigns.length;
    lastCampaignId = campaigns[campaigns.length - 1].id;
  }

  return queued;
}
