import { rewardJobSchema } from "@/lib/api/rewards/queue-reward-processing.ts";
import { withCron } from "@/lib/cron/with-cron";
import { prisma } from "@dub/prisma";
import { logAndRespond } from "../../utils";
import { handleRewardCreated } from "./handle-reward-created.ts";
import { handleRewardDeleted } from "./handle-reward-deleted.ts";
import { handleRewardUpdated } from "./handle-reward-updated.ts";

export const dynamic = "force-dynamic";

export const maxDuration = 600;

// POST /api/cron/rewards/sync-enrollments
export const POST = withCron(async ({ rawBody }) => {
  const input = rewardJobSchema.parse(JSON.parse(rawBody));

  const { event, payload } = input;
  const { groupId, rewardId } = payload;

  const reward = await prisma.reward.findUnique({
    where: {
      id: rewardId,
    },
    select: {
      id: true,
      event: true,
      createdAt: true,
    },
  });

  if (!reward) {
    return logAndRespond(`Reward ${rewardId} not found. Skipping...`);
  }

  const group = await prisma.partnerGroup.findUnique({
    where: {
      id: groupId,
    },
    select: {
      id: true,
      program: {
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          supportEmail: true,
        },
      },
    },
  });

  if (!group) {
    return logAndRespond(`Group ${groupId} not found. Skipping...`);
  }

  const params = {
    payload,
    program: group.program,
    group,
    reward,
  };

  switch (event) {
    case "reward-created":
      await handleRewardCreated(params);
      break;

    case "reward-updated":
      await handleRewardUpdated(params);
      break;

    case "reward-deleted":
      await handleRewardDeleted(params);
      break;
  }

  return logAndRespond(`Processed reward ${rewardId} for group ${groupId}.`);
});
