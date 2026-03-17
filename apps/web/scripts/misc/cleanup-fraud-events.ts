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
  console.log(fraudEvents.length);

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
  const fraudEventGroupIds = fraudEvents.map(
    (event) => event.fraudEventGroup.id,
  );

  const fraudEventGroupsWithNoEvents = await prisma.fraudEventGroup.findMany({
    where: {
      id: {
        in: fraudEventGroupIds,
      },
      fraudEvents: {
        none: {},
      },
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
