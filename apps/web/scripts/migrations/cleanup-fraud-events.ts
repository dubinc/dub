import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";

/**
 * Cleanup script for duplicate payout method fraud events.
 * Removes fraud events of type "partnerDuplicatePayoutMethod" where there's only
 * one partner in the group.
 */
async function main() {
  const fraudGroups = await prisma.fraudEvent.groupBy({
    by: ["groupKey"],
    where: {
      type: "partnerDuplicatePayoutMethod",
    },
    _count: true,
  });

  const fraudGroupWithOnePartner = fraudGroups.filter(
    (group) => group._count === 1,
  );

  console.log(
    `Found ${fraudGroupWithOnePartner.length} fraud groups with one partner.`,
  );

  const chunks = chunk(fraudGroupWithOnePartner, 100);

  // delete one by one
  for (const batch of chunks) {
    await prisma.fraudEvent.deleteMany({
      where: {
        groupKey: {
          in: batch.map(({ groupKey }) => groupKey),
        },
      },
    });

    console.log(`Deleted ${batch.length} fraud events.`);
  }
}

main();
