import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

// Existing link.clicked webhooks are always scoped to specific links,
// so backfill their linkScope to "links".

async function main() {
  const { count } = await prisma.webhook.updateMany({
    where: {
      scope: null,
      triggers: {
        array_contains: ["link.clicked"],
      },
    },
    data: {
      scope: "links",
    },
  });

  console.log(`Updated ${count} webhooks`);
}

main();
