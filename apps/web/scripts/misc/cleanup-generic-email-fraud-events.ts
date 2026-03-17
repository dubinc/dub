import "dotenv-flow/config";

import { isGenericEmail } from "@/lib/is-generic-email";
import { prisma } from "@dub/prisma";

async function main() {
  let fraudEvents = await prisma.fraudEvent.findMany({
    where: {
      fraudEventGroup: {
        type: "customerEmailMatch",
        resolvedAt: null,
      },
      OR: [
        {
          metadata: {
            path: "$.matchType",
            equals: "domainMatch",
          },
        },
        {
          metadata: {
            path: "$.matchType",
            equals: "historicalDomainMatch",
          },
        },
      ],
    },
    include: {
      partner: true,
      customer: true,
      fraudEventGroup: {
        select: {
          program: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Find fraud events with generic email
  fraudEvents = fraudEvents.filter(
    (event) => event.customer?.email && isGenericEmail(event.customer.email),
  );

  console.table(
    fraudEvents.map((event) => ({
      id: event.id,
      program: event.fraudEventGroup?.program?.name,
      partner: event.partner?.email,
      customer: event.customer?.email,
      createdAt: event.createdAt,
    })),
  );

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

  // Find fraud event groups with no events left
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
