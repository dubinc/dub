import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { REDIS_KEY } from "@/lib/webhook/click-webhook-workspaces";
import { LINK_CLICK_WEBHOOK_TRIGGER } from "@/lib/webhook/constants";
import "dotenv-flow/config";

async function main() {
  const webhooks = await prisma.webhook.findMany({
    where: {
      triggers: {
        array_contains: [LINK_CLICK_WEBHOOK_TRIGGER],
      },
    },
    select: {
      projectId: true,
    },
    distinct: ["projectId"],
  });

  const workspaceIds = webhooks.map((webhook) => webhook.projectId);

  if (workspaceIds.length === 0) {
    console.log("No workspaces with link.clicked webhooks found.");
    return;
  }

  await redis.sadd(REDIS_KEY, ...(workspaceIds as [string, ...string[]]));

  console.log(`Added ${workspaceIds.length} workspace(s) to ${REDIS_KEY}.`);
}

main();
