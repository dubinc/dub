import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// script to remove fraud events for cross-program bans
async function main() {
  const fraudEventsToRemove = await prisma.fraudEvent.findMany({
    where: {
      fraudEventGroup: {
        type: "partnerCrossProgramBan",
        status: "pending",
      },
    },
  });

  console.log(`Found ${fraudEventsToRemove.length} fraud events to remove`);

  const deleted = await prisma.fraudEvent.deleteMany({
    where: {
      id: {
        in: fraudEventsToRemove.map((event) => event.id),
      },
    },
  });

  console.log(`Removed ${deleted.count} fraud events`);

  const fraudEventGroupsWithNoEvents = await prisma.fraudEventGroup.findMany({
    where: {
      type: "partnerCrossProgramBan",
      status: "pending",
      fraudEvents: {
        none: {},
      },
    },
  });

  console.log(
    `Found ${fraudEventGroupsWithNoEvents.length} fraud event groups with no events`,
  );

  const deletedGroups = await prisma.fraudEventGroup.deleteMany({
    where: {
      id: {
        in: fraudEventGroupsWithNoEvents.map((group) => group.id),
      },
    },
  });

  console.log(`Removed ${deletedGroups.count} fraud event groups`);
}

main();
