import { PRISMA_UPDATEMANY_LIMIT } from "@/lib/cron";
import { prisma } from "@/lib/prisma";
import { LINK_CLICK_WEBHOOK_TRIGGER } from "@/lib/webhook/constants";

// periodically remove redundant LinkWebhook entries for webhooks that are not scoped to links (folders, workspace)
// we do this in case clients are still passing webhookIds when creating links, which will create LinkWebhook entries
export const cleanupRedundantLinkWebhookEntries = async () => {
  const nonLinkScopeWebhooks = await prisma.webhook.findMany({
    where: {
      triggers: {
        array_contains: [LINK_CLICK_WEBHOOK_TRIGGER],
      },
      linkScope: {
        not: "links",
      },
      links: {
        some: {},
      },
    },
  });

  let deletedCount = 0;
  while (true) {
    const linksToDelete = await prisma.linkWebhook.findMany({
      where: {
        webhookId: {
          in: nonLinkScopeWebhooks.map((webhook) => webhook.id),
        },
      },
      take: PRISMA_UPDATEMANY_LIMIT,
    });
    const deleted = await prisma.linkWebhook.deleteMany({
      where: {
        id: {
          in: linksToDelete.map((link) => link.id),
        },
      },
    });
    deletedCount += deleted.count;
    if (deleted.count === 0) {
      console.log("No more redundant LinkWebhook entries to delete");
      break;
    }
    console.log(`Deleted ${deleted.count} redundant LinkWebhook entries`);
  }
  return deletedCount;
};
