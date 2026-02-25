import { prisma } from "@dub/prisma";
import { getSearchParams } from "@dub/utils";
import "dotenv-flow/config";

const programId = "prog_xxx";
const excludedCampaignIds: string[] = [];

async function main() {
  const fraudEvents = await prisma.fraudEvent.findMany({
    where: {
      programId,
      fraudEventGroup: {
        type: "paidTrafficDetected",
        status: "pending",
      },
    },
  });

  console.log(`Found ${fraudEvents.length} fraud events`);

  const fraudEventsToRemove = fraudEvents.filter((event) => {
    const metadata = event.metadata as { source: string; url: string };
    const { gad_campaignid, utm_campaign } = getSearchParams(metadata.url);
    return (
      (gad_campaignid && excludedCampaignIds.includes(gad_campaignid)) ||
      (utm_campaign && excludedCampaignIds.includes(utm_campaign))
    );
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
      programId,
      type: "paidTrafficDetected",
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
