import "dotenv-flow/config";

import { prisma } from "@dub/prisma";

async function main() {
  const fraudEvents = await prisma.fraudEvent.findMany({
    where: {
      fraudEventGroup: {
        type: "customerEmailMatch",
        resolvedAt: null,
      },
      metadata: {
        path: "$.matchType",
        equals: "historicalDomainMatch",
      },
      customer: {
        sales: {
          gt: 1,
        },
      },
    },
    select: {
      id: true,
      fraudEventGroup: {
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  console.table(fraudEvents);

  // Remove fraud events
  if (fraudEvents.length > 0) {
    const { count } = await prisma.fraudEvent.deleteMany({
      where: {
        id: {
          in: fraudEvents.map((event) => event.id),
        },
      },
    });

    console.log(`Removed ${count} fraud events`);
  }

  // Remove fraud group if no events left
  const fraudEventGroupsWithNoEvents = await prisma.fraudEventGroup.findMany({
    where: {
      fraudEvents: {
        none: {},
      },
    },
    select: {
      id: true,
    },
  });

  console.log(
    `Found ${fraudEventGroupsWithNoEvents.length} with no events left.`,
  );

  if (fraudEventGroupsWithNoEvents.length > 0) {
    const { count } = await prisma.fraudEventGroup.deleteMany({
      where: {
        id: {
          in: fraudEventGroupsWithNoEvents.map((group) => group.id),
        },
      },
    });

    console.log(`Removed ${count} fraud event groups`);
  }
}

main();
