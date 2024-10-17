import { prisma } from "@/lib/prisma";
import { webhookCache } from "@/lib/webhook/cache";
import "dotenv-flow/config";

async function main() {
  // Find link level webhooks
  const linkLevelWebhooks = await prisma.webhook.findMany({
    where: {
      triggers: {
        array_contains: ["link.clicked"],
      },
    },
    select: {
      id: true,
      url: true,
      secret: true,
      triggers: true,
      disabledAt: true,
    },
  });

  const result = await Promise.all(
    linkLevelWebhooks.map((webhook) => webhookCache.set(webhook)),
  );

  console.log(`Cache updated for ${result.length} webhooks`);
}

main();
