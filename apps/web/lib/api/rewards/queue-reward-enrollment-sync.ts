import { qstash } from "@/lib/cron";
import { EventType } from "@dub/prisma/client";
import { APP_DOMAIN_WITH_NGROK } from "@dub/utils";

export interface RewardSnapshot {
  title: string;
  description: string;
  icon: string;
}

export interface QueueRewardEnrollmentSyncProps {
  action: "create" | "delete";
  rewardId: string;
  groupId: string;
  programId: string;
  event: EventType;
  startAfterProgramEnrollmentId?: string;
  rewardSnapshot?: RewardSnapshot;
  delay?: number;
}

const queue = qstash.queue({
  queueName: "reward-enrollment-sync",
});

export async function queueRewardEnrollmentSync({
  action,
  rewardId,
  groupId,
  programId,
  event,
  startAfterProgramEnrollmentId,
  rewardSnapshot,
  delay,
}: QueueRewardEnrollmentSyncProps) {
  return await queue.enqueueJSON({
    url: `${APP_DOMAIN_WITH_NGROK}/api/cron/rewards/sync-enrollments`,
    method: "POST",
    ...(delay && { delay }),
    body: {
      action,
      rewardId,
      groupId,
      programId,
      event,
      ...(startAfterProgramEnrollmentId && { startAfterProgramEnrollmentId }),
      ...(rewardSnapshot && { rewardSnapshot }),
    },
  });
}
