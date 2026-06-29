import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

// Existing link.clicked webhooks are always targeted to specific links,
// so backfill their linkTarget to "links".

async function main() {
  const { count } = await prisma.webhook.updateMany({
    where: {
      linkTarget: null,
      triggers: {
        array_contains: ["link.clicked"],
      },
    },
    data: {
      linkTarget: "links",
    },
  });

  console.log(`Updated ${count} webhooks`);
}

main();
