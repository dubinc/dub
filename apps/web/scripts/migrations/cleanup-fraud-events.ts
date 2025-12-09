import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// Remove partnerDuplicatePayoutMethod fraud events without a group
async function main() {
  const fraudEvents = await prisma.fraudEvent.findMany({
    where: {
      type: "partnerDuplicatePayoutMethod",
      fraudEventGroupId: null,
    },
    select: {
      id: true,
      fraudEventGroupId: true,
    },
  });

  console.log(
    `Found ${fraudEvents.length} partnerDuplicatePayoutMethod fraud events without a group.`,
  );

  const deletedEvents = await prisma.fraudEvent.deleteMany({
    where: {
      id: {
        in: fraudEvents.map(({ id }) => id),
      },
    },
  });

  console.log(
    `Deleted ${deletedEvents.count} partnerDuplicatePayoutMethod fraud events without a group.`,
  );
}

main();
