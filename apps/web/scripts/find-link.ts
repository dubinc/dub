import { prisma } from "@dub/prisma";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const terminalCommissions = await prisma.commission.findMany({
    where: {
      programId: "prog_MuZ3Tpycbzsp9c1FuYR03c4u",
      status: {
        in: ["refunded", "duplicate", "fraud", "canceled"],
      },
      rewardId: null,
    },
  });

  console.log(`Found ${terminalCommissions.length} terminal commissions`);

  const toDelete = await prisma.activityLog.findMany({
    where: {
      programId: "prog_MuZ3Tpycbzsp9c1FuYR03c4u",
      resourceType: "commission",
      resourceId: {
        in: terminalCommissions.map((commission) => commission.id),
      },
    },
  });

  console.log(`Found ${toDelete.length} activity logs to delete`);

  const chunks = chunk(toDelete, 1000);
  for (const chunk of chunks) {
    const deleted = await prisma.activityLog.deleteMany({
      where: {
        id: {
          in: chunk.map((log) => log.id),
        },
      },
    });
    console.log(`Deleted ${deleted.count} activity logs`);
  }
}

main();
