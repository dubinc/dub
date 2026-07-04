import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

// Existing link.clicked webhooks are always targeted to specific links,
// so backfill their linkScope to "links".

async function main() {
  const { count } = await prisma.webhook.updateMany({
    where: {
      linkScope: null,
      triggers: {
        array_contains: ["link.clicked"],
      },
    },
    data: {
      linkScope: "links",
    },
  });

  console.log(`Updated ${count} webhooks`);
}

main();
