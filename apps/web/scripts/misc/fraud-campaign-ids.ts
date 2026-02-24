import { prisma } from "@dub/prisma";
import { getSearchParams } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const fraudEvents = await prisma.fraudEvent.findMany({
    where: {
      programId: "prog_xxx",
      fraudEventGroup: {
        type: "paidTrafficDetected",
        status: "pending",
      },
    },
  });

  console.log(`Found ${fraudEvents.length} fraud events`);

  const topCampaignIds = new Map<string, number>();

  for (const event of fraudEvents) {
    const metadata = event.metadata as { source: string; url: string };
    const { gad_campaignid } = getSearchParams(metadata.url);
    if (gad_campaignid) {
      topCampaignIds.set(
        gad_campaignid,
        (topCampaignIds.get(gad_campaignid) || 0) + 1,
      );
    }
  }

  const sortedTopCampaignIds = Array.from(topCampaignIds.entries()).sort(
    (a, b) => b[1] - a[1],
  );

  console.table(
    sortedTopCampaignIds.map(([campaignId, count]) => ({
      campaignId,
      count,
    })),
  );

  console.log(
    `"${sortedTopCampaignIds.map(([campaignId]) => campaignId).join('", "')}"`,
  );
}

main();
